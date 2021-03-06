import {
    autoserializeAs,
    autoserializeAsArray,
    autoserializeAsJson,
    autoserializeAsMap,
    autoserializeAsObjectMap,
    autoserializeAsSet,
    autoserializeUsing,
    defaultValue,
    Deserialize,
    DeserializeArray,
    deserializeAs,
    deserializeAsArray,
    deserializeAsJson,
    deserializeAsMap,
    deserializeAsObjectMap,
    deserializeAsSet,
    deserializeUsing,
    emitDefaultValue,
    inheritSerialization,
    isReference,
    itIsAnArray,
    onDeserialized,
    RefClean,
    RefCycleDetectionDisable,
    RefCycleDetectionEnable,
    SetDefaultInstantiationMethod,
    SetDeserializeKeyTransform,
} from "../src";
import {
    RuntimeTypingDisable,
    RuntimeTypingEnable,
    RuntimeTypingResetDictionary,
    RuntimeTypingSetTypeString,
} from "../src/runtime_typing";
import {
    ArrayHandling,
    IIndexable,
    IJsonObject,
    InstantiationMethod,
    JsonType,
} from "../src/types";

function expectInstance(
    instance: any,
    type: any,
    instantiationMethod: InstantiationMethod
) {
    switch (instantiationMethod) {
        case InstantiationMethod.New:
        case InstantiationMethod.ObjectCreate:
            expect(instance instanceof type).toBe(true);
            break;

        case InstantiationMethod.None:
            expect(instance instanceof type).toBeFalsy();
            expect(typeof instance).toBe("object");
            break;
    }
}

function expectTarget(target: any, instance: any, shouldMakeTarget: boolean) {
    expect(instance === target).toBe(shouldMakeTarget);
}

function createTarget<T>(
    shouldMakeTarget: boolean,
    shouldInstantiationMethod: InstantiationMethod,
    type: new() => T
): T | null {
    if (!shouldMakeTarget) {
        return null;
    }

    switch (shouldInstantiationMethod) {
        case InstantiationMethod.New:
            return new type();

        case InstantiationMethod.ObjectCreate:
            return Object.create(type.prototype) as T;

        case InstantiationMethod.None:
            return {} as T;
    }
}

describe("Deserializing", () => {

    describe("Unannotated", () => {

        it("will not deserialize unannotated fields", () => {

            class Test {
                public value: number = 1;
            }

            const instance = Deserialize({ value: 2 }, () => Test);
            expect(instance.value).toBe(1);
            expect(instance instanceof Test).toBe(true);

        });

    });

    describe("DeserializeAs", () => {

        function runTests(blockName: string,
                          instantiationMethod: InstantiationMethod,
                          testDeserializeAs: Function,
                          makeTarget: boolean) {

            describe(blockName, () => {

                it("deserializes basic primitives", () => {
                    class Test {
                        @testDeserializeAs(() => String)
                        public value0: string = "strValue";
                        @testDeserializeAs(() => Boolean)
                        public value1: boolean = true;
                        @testDeserializeAs(() => Number)
                        public value2: number = 100;
                    }

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize({
                        value0: "strValue1",
                        value1: false,
                        value2: 101
                    }, () => Test, target, instantiationMethod);
                    expect(instance.value0).toBe("strValue1");
                    expect(instance.value1).toBe(false);
                    expect(instance.value2).toBe(101);
                    expectTarget(instance, target, makeTarget);
                    expectInstance(instance, Test, instantiationMethod);

                });

                it("deserializes a Date", () => {
                    class Test {
                        @testDeserializeAs(() => Date)
                        public value0!: Date;
                    }

                    const d = new Date().toString();
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize({ value0: d }, () => Test, target, instantiationMethod);
                    expect(instance.value0 instanceof Date).toBe(true);
                    expect(instance.value0.toString()).toBe(d);
                    expectTarget(target, instance, makeTarget);
                    expectInstance(instance, Test, instantiationMethod);
                });

                it("deserializes a RegExp", () => {
                    class Test {
                        @testDeserializeAs(() => RegExp)
                        public value0!: RegExp;
                    }

                    const d = (new RegExp("/[123]/g")).toString();
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize({ value0: d }, () => Test, target, instantiationMethod);
                    expect(instance.value0 instanceof RegExp).toBe(true);
                    expect(instance.value0.toString()).toBe(d);
                    expectTarget(instance, target, makeTarget);
                    expectInstance(instance, Test, instantiationMethod);

                });

                it("deserializes a non primitive value", () => {
                    class Thing {
                        @testDeserializeAs(() => Number)
                        public value: number = 1;
                    }

                    class Test {
                        @testDeserializeAs(() => Thing)
                        public thing!: Thing;
                    }

                    const target = createTarget(makeTarget, instantiationMethod, Test) as Test;
                    if (target) {
                        target.thing = createTarget(makeTarget, instantiationMethod, Thing) as Thing;
                    }
                    const instance = Deserialize({ thing: { value: 2 } }, () => Test, target, instantiationMethod);
                    expect(instance.thing.value).toBe(2);
                    expectTarget(target, instance, makeTarget);
                    if (target) {
                        expectTarget(target.thing, instance.thing, makeTarget);
                    }
                    expectInstance(instance.thing, Thing, instantiationMethod);
                    expectInstance(instance, Test, instantiationMethod);
                });

                it("deserializes non matching primitive types", () => {
                    class Test {
                        @testDeserializeAs(() => Number)
                        public value0!: string;
                        @testDeserializeAs(() => String)
                        public value1!: boolean;
                        @testDeserializeAs(() => Boolean)
                        public value2!: number;
                    }

                    const json = {
                        value0: 100,
                        value1: true,
                        value2: "100"
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.value0).toBe(100);
                    expect(instance.value1).toBe("true");
                    expect(instance.value2).toBe(true);
                    expectTarget(target, instance, makeTarget);
                });

                it("deserializes with different keys", () => {
                    class Test {
                        @testDeserializeAs(() => String, "str")
                        public value0!: string;
                        @testDeserializeAs(() => Boolean, "bool")
                        public value1!: boolean;
                        @testDeserializeAs(() => Number, "num")
                        public value2!: number;
                    }

                    const json = {
                        bool: true,
                        num: 100,
                        str: "strValue"
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.value0).toBe("strValue");
                    expect(instance.value1).toBe(true);
                    expect(instance.value2).toBe(100);
                    expectTarget(target, instance, makeTarget);
                });

                it("skips undefined keys", () => {
                    class Test {
                        @testDeserializeAs(() => String)
                        public value0: string = "val";
                        @testDeserializeAs(() => Boolean)
                        public value1!: boolean;
                        @testDeserializeAs(() => Number)
                        public value2!: number;
                    }

                    const json: IJsonObject = {
                        value0: undefined,
                        value1: true,
                        value2: 100
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    if (instantiationMethod) {
                        expect(instance.value0).toBe("val");
                    }
                    else {
                        expect(instance.value0).toBeUndefined();
                    }
                    expect(instance.value1).toBe(true);
                    expect(instance.value2).toBe(100);
                });

                it("does not skip null keys", () => {
                    class Test {
                        @testDeserializeAs(() => String)
                        public value0: string = "val";
                        @testDeserializeAs(() => Boolean)
                        public value1!: boolean;
                        @testDeserializeAs(() => Number)
                        public value2!: number;
                    }

                    const json: IJsonObject = {
                        value0: null,
                        value1: true,
                        value2: 100
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.value0).toBe(null);
                    expect(instance.value1).toBe(true);
                    expect(instance.value2).toBe(100);
                    expectTarget(target, instance, makeTarget);

                });

                it("deserializes nested types", () => {
                    class Test {
                        @testDeserializeAs(() => String)
                        public value0: string = "bad";
                        @testDeserializeAs(() => Boolean)
                        public value1: boolean = false;
                        @testDeserializeAs(() => Number)
                        public value2: number = 1;
                    }

                    class Test0 {
                        @testDeserializeAs(() => Test)
                        public test!: Test;
                    }

                    const json = {
                        test: { value0: "str", value1: true, value2: 100 }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test0);
                    if (target) { target.test = createTarget(makeTarget, instantiationMethod, Test) as Test; }
                    const instance = Deserialize(json, () => Test0, target, instantiationMethod);
                    expectInstance(instance.test, Test, instantiationMethod);
                    if (target) { expectInstance(target.test, Test, instantiationMethod); }
                    expect(instance.test.value0).toBe("str");
                    expect(instance.test.value1).toBe(true);
                    expect(instance.test.value2).toBe(100);
                });

                it("deserializes doubly nested types", () => {
                    class Test0 {
                        @testDeserializeAs(() => String)
                        public value0: string = "bad";
                        @testDeserializeAs(() => Boolean)
                        public value1: boolean = false;
                        @testDeserializeAs(() => Number)
                        public value2: number = 1;
                    }

                    class Test1 {
                        @testDeserializeAs(() => Test0)
                        public test0!: Test0;
                    }

                    class Test2 {
                        @testDeserializeAs(() => Test1)
                        public test1!: Test1;
                    }

                    const json = {
                        test1: { test0: { value0: "str", value1: true, value2: 100 } }
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test2);
                    if (target) {
                        target.test1 = createTarget(makeTarget, instantiationMethod, Test1) as Test1;
                        if (target.test1) {
                            target.test1.test0 = createTarget(makeTarget, instantiationMethod, Test0) as Test0;
                        }
                    }
                    const instance = Deserialize(json, () => Test2, target, instantiationMethod);
                    expectInstance(instance.test1, Test1, instantiationMethod);
                    expectInstance(instance.test1.test0, Test0, instantiationMethod);
                    if (target) {
                        expectTarget(target, instance, makeTarget);
                        expectTarget(target.test1, instance.test1, makeTarget);
                        expectTarget(target.test1.test0, instance.test1.test0, makeTarget);
                    }
                    expect(instance.test1.test0.value0).toBe("str");
                    expect(instance.test1.test0.value1).toBe(true);
                    expect(instance.test1.test0.value2).toBe(100);
                });

            });

        }

        runTests("Normal > Create Instances > With Target", InstantiationMethod.New, deserializeAs, true);
        runTests("Normal > Create Instances > Without Target", InstantiationMethod.New, deserializeAs, false);
        runTests("Normal > No Instances > With Target", InstantiationMethod.None, deserializeAs, true);
        runTests("Normal > No Instances > Without Target", InstantiationMethod.None, deserializeAs, false);
        runTests("Auto > Create Instances > With Target", InstantiationMethod.New, autoserializeAs, true);
        runTests("Auto > Create Instances > Without Target", InstantiationMethod.New, autoserializeAs, false);
        runTests("Auto > No Instances > With Target", InstantiationMethod.None, autoserializeAs, true);
        runTests("Auto > No Instances > Without Target", InstantiationMethod.None, autoserializeAs, false);

    });

    describe("DeserializeAsArray", () => {

        class Element {
            @autoserializeAs(() => String)
            public name: string;
            @autoserializeAs(() => Number)
            public val: number;
            constructor(name1: string, val1: number) {
                this.name = name1;
                this.val = val1;
            }
        }
        function runTests(blockName: string,
                          arrayHandling: ArrayHandling,
                          expected: Partial<Element>[]) {

            it(blockName, () => {
                    class Test {
                        @deserializeAsArray(() => Element, () => Array, "values", arrayHandling)
                        public values: Element[];
                        constructor() {
                            this.values = [
                                { name: "1", val: 1 },
                                { name: "2", val: 2 },
                                { name: "3", val: 3 }
                            ];
                        }
                    }

                    const json: IJsonObject = { values: [{ name: "4" }, { name: "5", val: 25 }] };
                    const target = new Test();
                    const instance = Deserialize(json, () => Test, target);
                    expect(instance.values).toEqual(expected);
            });

        }

        runTests("Into",
        ArrayHandling.Into,
        [
            { name: "4", val: 1 }, // we write {name: "4" } onto the object { name: "1", val: 1 }
            { name: "5", val: 25 }
        ]
        );
        runTests("Concat At The End",
        ArrayHandling.ConcatAtTheEnd,
        [
            { name: "1", val: 1 },
            { name: "2", val: 2 },
            { name: "3", val: 3 },
            { name: "4" },
            { name: "5", val: 25 }
        ]
        );
        runTests("New",
        ArrayHandling.New,
        [
            { name: "4" },
            { name: "5", val: 25 }
        ]
        );

    });

    describe("DeserializeAsObjectMap", () => {

        function runTests(blockName: string,
                          instantiationMethod: InstantiationMethod,
                          testDeserializeAs: Function,
                          testDeserializeAsObjectMap: Function,
                          makeTarget: boolean) {

            describe(blockName, () => {

                it("deserializes a map of primitives", () => {

                    class Test {
                        @testDeserializeAsObjectMap(() => Number)
                        public values!: IIndexable<number>;
                    }

                    const json = { values: { v0: 0, v1: 1, v2: 2 } };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.values).toEqual({ v0: 0, v1: 1, v2: 2 });
                    expectInstance(instance, Test, instantiationMethod);
                    expectTarget(target, instance, makeTarget);

                });

                it("deserializes a map of non primitives", () => {
                    class TestType {
                        @testDeserializeAs(() => Number)
                        public value: number;

                        constructor(arg: number) {
                            this.value = arg;
                        }
                    }

                    class Test {
                        @testDeserializeAsObjectMap(() => TestType)
                        public values!: IIndexable<TestType>;
                    }

                    const json = {
                        values: {
                            v0: { value: 1 },
                            v1: { value: 2 },
                            v2: { value: 3 }
                        }
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.values.v0).toEqual({ value: 1 });
                    expect(instance.values.v1).toEqual({ value: 2 });
                    expect(instance.values.v2).toEqual({ value: 3 });
                });

                it("deserializes a map of string to array of number", () => {
                    class TestType {
                        @testDeserializeAs(() => Number)
                        public value: number;

                        constructor(arg: number) {
                            this.value = arg;
                        }
                    }

                    class Test {
                        @testDeserializeAsObjectMap(itIsAnArray(() => TestType))
                        public values!: IIndexable<TestType[]>;
                    }

                    const json = {
                        values: {
                            v1: [{ value: 11 }, { value: 12 }, { value: 13 }],
                            v2: [{ value: 21 }, { value: 22 }, { value: 23 }],
                            v3: [{ value: 31 }, { value: 32 }, { value: 33 }]
                        }
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.values).toEqual({
                        v1: [{ value: 11 }, { value: 12 }, { value: 13 }],
                        v2: [{ value: 21 }, { value: 22 }, { value: 23 }],
                        v3: [{ value: 31 }, { value: 32 }, { value: 33 }]
                    });
                });

                it("deserializes nested maps", () => {
                    class TestType {
                        @testDeserializeAsObjectMap(() => Number)
                        public value: IIndexable<number>;

                        constructor(arg: IIndexable<number>) {
                            this.value = arg;
                        }
                    }

                    class Test {
                        @testDeserializeAsObjectMap(() => TestType)
                        public values!: IIndexable<TestType>;
                    }

                    const json = {
                        values: {
                            v0: { value: { v00: 1, v01: 2 } },
                            v1: { value: { v10: 2, v11: 2 } },
                            v2: { value: { v20: 3, v21: 2 } }
                        }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.values).toEqual({
                        v0: { value: { v00: 1, v01: 2 } },
                        v1: { value: { v10: 2, v11: 2 } },
                        v2: { value: { v20: 3, v21: 2 } }
                    });
                });

                it("skips undefined keys", () => {
                    class Test {
                        @testDeserializeAsObjectMap(() => Number)
                        public values!: IIndexable<number>;
                    }

                    const json: IJsonObject = {
                        values: {
                            v0: undefined,
                            v1: 1,
                            v2: 2
                        }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        values: {
                            v1: 1,
                            v2: 2
                        }
                    });
                });

                it("deserializes a map with different key name", () => {
                    class TestType {
                        @testDeserializeAs(() => Number)
                        public value: number;

                        constructor(arg: number) {
                            this.value = arg;
                        }
                    }

                    class Test {
                        @testDeserializeAsObjectMap(() => TestType, "different")
                        public values!: IIndexable<TestType>;
                    }

                    const json = {
                        different: { v0: { value: 1 }, v1: { value: 2 } }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.values).toEqual({
                        v0: { value: 1 }, v1: { value: 2 }
                    });

                });

                it("throws an exception if input is not a map type", () => {
                    class Test {
                        @testDeserializeAsObjectMap(Number)
                        public values!: IIndexable<number>;
                    }

                    expect(() => {
                        const json = { values: 1 };
                        const target = createTarget(makeTarget, instantiationMethod, Test);
                        Deserialize(json, () => Test, target, instantiationMethod);
                    }).toThrow("Expected input to be of type `object` but received: number");

                    expect(() => {
                        const json = { values: false };
                        const target = createTarget(makeTarget, instantiationMethod, Test);
                        Deserialize(json, () => Test, target, instantiationMethod);
                    }).toThrow("Expected input to be of type `object` but received: boolean");

                    expect(() => {
                        const json = { values: "str" };
                        const target = createTarget(makeTarget, instantiationMethod, Test);
                        Deserialize(json, () => Test, target, instantiationMethod);
                    }).toThrow("Expected input to be of type `object` but received: string");

                });

                it("deserializes a null map", () => {

                    class Test {
                        @testDeserializeAsObjectMap(Number)
                        public values!: IIndexable<number>;
                    }

                    const json: IJsonObject = { values: null };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance.values).toBeNull();

                });

            });

        }

        runTests("Normal > Create Instances > With Target",
        InstantiationMethod.New, deserializeAs, deserializeAsObjectMap, true);
        runTests("Normal > Create Instances > Without Target",
        InstantiationMethod.New, deserializeAs, deserializeAsObjectMap, false);
        runTests("Normal > No Instances > With Target",
        InstantiationMethod.None, deserializeAs, deserializeAsObjectMap, true);
        runTests("Normal > No Instances > Without Target",
        InstantiationMethod.None, deserializeAs, deserializeAsObjectMap, false);
        runTests("Auto > Create Instances > With Target",
        InstantiationMethod.New, autoserializeAs, autoserializeAsObjectMap, true);
        runTests("Auto > Create Instances > Without Target",
        InstantiationMethod.New, autoserializeAs, autoserializeAsObjectMap, false);
        runTests("Auto > No Instances > With Target",
        InstantiationMethod.None, autoserializeAs, autoserializeAsObjectMap, true);
        runTests("Auto > No Instances > Without Target",
        InstantiationMethod.None, autoserializeAs, autoserializeAsObjectMap, false);

    });

    describe("DeserializeAsMap", () => {
                it("deserializes a map of primitives", () => {

                    class Test {
                        @deserializeAsMap(() => String, () => Number)
                        public values!: Map<string, number>;
                    }

                    const json = { values: { v0: 0, v1: 1, v2: 2 } };
                    const instance = Deserialize(json, () => Test);
                    expect(instance.values.get("v0")).toEqual(0);
                    expect(instance.values.get("v1")).toEqual(1);
                    expect(instance.values.get("v2")).toEqual(2);
                });

                it("deserializes nested maps", () => {
                    class TestType {
                        @deserializeAsMap(() => String, () => Number)
                        public value: Map<string, Number>;

                        constructor(arg: Map<string, number>) {
                            this.value = arg;
                        }
                    }

                    class Test {
                        @deserializeAsMap(() => String, () => TestType)
                        public values!: Map<string, TestType>;
                    }

                    const json = {
                        values: {
                            v0: { value: { v00: 1, v01: 2 } },
                            v1: { value: { v10: 2, v11: 2 } },
                            v2: { value: { v20: 3, v21: 2 } }
                        }
                    };
                    const instance = Deserialize(json, () => Test);
                    expect((instance.values.get("v0") as TestType).value.get("v00")).toEqual(1);
                    expect((instance.values.get("v0") as TestType).value.get("v01")).toEqual(2);
                    expect((instance.values.get("v1") as TestType).value.get("v10")).toEqual(2);
                    expect((instance.values.get("v1") as TestType).value.get("v11")).toEqual(2);
                    expect((instance.values.get("v2") as TestType).value.get("v20")).toEqual(3);
                    expect((instance.values.get("v2") as TestType).value.get("v21")).toEqual(2);
                });

                it("skips undefined keys", () => {
                    class Test {
                        @deserializeAsMap(() => String, () => Number)
                        public values!: Map<string, number>;
                    }

                    const json: IJsonObject = {
                        values: {
                            v0: undefined,
                            v1: 1,
                            v2: 2
                        }
                    };
                    const instance = Deserialize(json, () => Test);
                    expect(instance.values.size).toEqual(2);
                });

                it("deserializes a map with different key name", () => {
                    class TestType {
                        @deserializeAs(() => Number)
                        public value: number;

                        constructor(arg: number) {
                            this.value = arg;
                        }
                    }

                    class Test {
                        @deserializeAsMap(() => String, () => TestType, () => Map, "different")
                        public values!: Map<String, TestType>;
                    }

                    const json = {
                        different: { v0: { value: 1 }, v1: { value: 2 } }
                    };
                    const instance = Deserialize(json, () => Test);
                    expect((instance.values.get("v0") as TestType).value).toEqual(1);
                    expect((instance.values.get("v1") as TestType).value).toEqual(2);

                });

                it("deserializes a null map", () => {

                    class Test {
                        @deserializeAsMap(() => Number, () => String)
                        public values!: Map<number, string>;
                    }

                    const json: IJsonObject = { values: null };
                    const instance = Deserialize(json, () => Test);
                    expect(instance.values).toBeNull();

                });
            });

    describe("DeserializeAsSet", () => {
        it("deserializes a Set of primitives", () => {
            class Test {
                @deserializeAsSet(() => Number, () => Set)
                public value!: Set<number>;
            }

            const json = { value: [1, 2, 3] };
            const instance = Deserialize(json, () => Test);
            expect(instance.value instanceof Set).toBeTruthy();
            expect(instance.value.size).toEqual(3);
            expect(instance.value.has(1)).toBe(true);
            expect(instance.value.has(2)).toBe(true);
            expect(instance.value.has(3)).toBe(true);
        });

        it("deserializes a custom Set of primitives", () => {
            class MySet<T> extends Set<T> {}
            class Test {
                @deserializeAsSet(() => Number, () => MySet)
                public value!: MySet<number>;
            }

            const json = { value: [1, 2, 3] };
            const instance = Deserialize(json, () => Test);
            expect(instance.value instanceof MySet).toBeTruthy();
            expect(instance.value.size).toEqual(3);
            expect(instance.value.has(1)).toBe(true);
            expect(instance.value.has(2)).toBe(true);
            expect(instance.value.has(3)).toBe(true);
        });

        it("deserializes a Set of typed objects", () => {
            class TestType {
                @deserializeAs(() => String)
                public strVal: string;

                constructor(val: string) {
                    this.strVal = val;
                }
            }

            class Test {
                @deserializeAsSet(() => TestType)
                public value!: Set<TestType>;
            }

            const json = {
                value: [
                    { strVal: "0" },
                    { strVal: "1" },
                    { strVal: "2" }
                ]
            };

            const instance = Deserialize(json, () => Test);
            const value = Array.from(instance.value.keys());
            expect(value[0] instanceof TestType).toBeTruthy();
            expect(value[1] instanceof TestType).toBeTruthy();
            expect(value[2] instanceof TestType).toBeTruthy();

            expect(instance.value.size).toBe(3);
        });

        it("deserializes nested Sets", () => {
            class TestTypeL0 {
                @deserializeAs(() => String)
                public strVal: string;

                constructor(val: string) {
                    this.strVal = val;
                }

            }

            class TestTypeL1 {
                @deserializeAsSet(() => TestTypeL0)
                public l0List: Set<TestTypeL0>;

                constructor(l0List: Set<TestTypeL0>) {
                    this.l0List = l0List;
                }

            }

            class Test {
                @deserializeAsSet(() => TestTypeL1)
                public value!: Set<TestTypeL1>;
            }

            const json = {
                value: [
                    { l0List: [{ strVal: "00" }, { strVal: "01" }] },
                    { l0List: [{ strVal: "10" }, { strVal: "11" }] },
                    { l0List: [{ strVal: "20" }, { strVal: "21" }] }
                ]
            };

           const instance = Deserialize(json as IJsonObject, () => Test);
            const keyTest = Array.from(instance.value.keys());
            expect(keyTest[0] instanceof TestTypeL1).toBeTruthy();
            expect(keyTest[1] instanceof TestTypeL1).toBeTruthy();
            expect(keyTest[2] instanceof TestTypeL1).toBeTruthy();
            const keyTestTypeL1_0 = Array.from(keyTest[0].l0List.keys());
            expect(keyTestTypeL1_0[0].strVal).toBe("00");
            expect(keyTestTypeL1_0[1].strVal).toBe("01");
            const keyTestTypeL1_1 = Array.from(keyTest[1].l0List.keys());
            expect(keyTestTypeL1_1[0].strVal).toBe("10");
            expect(keyTestTypeL1_1[1].strVal).toBe("11");
            const keyTestTypeL1_2 = Array.from(keyTest[2].l0List.keys());
            expect(keyTestTypeL1_2[0].strVal).toBe("20");
            expect(keyTestTypeL1_2[1].strVal).toBe("21");

        });

        it("deserializes a Set with a different key", () => {

            class Test {
                @deserializeAsSet(() => Number, () => Set, "different")
                public value!: Set<number>;
            }

            const json = { different: [1, 2, 3] };

            const instance = Deserialize(json, () => Test);
            expect(instance.value.has(1)).toBe(true);
            expect(instance.value.has(2)).toBe(true);
            expect(instance.value.has(3)).toBe(true);
        });

        it("throws an error if input type is not a Set", () => {

            class Test {
                @deserializeAsSet(() => Number)
                public values!: Set<number>;
            }

            expect(() => {
                const json = { values: 1 };
                Deserialize(json, () => Test);
            }).toThrow("Expected input to be an array but received: number");

            expect(() => {
                const json = { values: false };
                Deserialize(json, () => Test);
            }).toThrow("Expected input to be an array but received: boolean");

            expect(() => {
                const json = { values: "str" };
                Deserialize(json, () => Test);
            }).toThrow("Expected input to be an array but received: string");

            expect(() => {
                const json = { values: {} };
                Deserialize(json, () => Test);
            }).toThrow("Expected input to be an array but received: object");

        });
    });

    describe("DeserializeJSON", () => {

        function runTests(blockName: string,
                          instantiationMethod: InstantiationMethod,
                          testDeserializeAs: Function,
                          testDeserializeAsJson: Function,
                          makeTarget: boolean) {

            describe(blockName, () => {

                it("deserializes a primitive as json", () => {

                    class Test {
                        @testDeserializeAsJson()
                        public value0!: string;
                        @testDeserializeAsJson()
                        public value1!: boolean;
                        @testDeserializeAsJson()
                        public value2!: number;
                    }

                    const json = {
                        value0: "strValue",
                        value1: true,
                        value2: 1
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        value0: "strValue",
                        value1: true,
                        value2: 1
                    });

                });

                it("deserializes an array of primitives as json", () => {

                    class Test {
                        @testDeserializeAsJson()
                        public value0!: string[];
                        @testDeserializeAsJson()
                        public value1!: boolean[];
                        @testDeserializeAsJson()
                        public value2!: number;
                    }

                    const json = {
                        value0: ["strValue", "00"],
                        value1: [false, true],
                        value2: 100
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        value0: ["strValue", "00"],
                        value1: [false, true],
                        value2: 100
                    });

                });

                it("skips undefined keys", () => {
                    class Test {
                        @testDeserializeAsJson()
                        public value!: IIndexable<number>;
                    }

                    const json: IJsonObject = {
                        value: {
                            v0: 1,
                            v1: undefined,
                            v2: 2
                        }
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        value: {
                            v0: 1,
                            v2: 2
                        }
                    });

                });

                it("deserializes an array of non primitives as json", () => {

                    class Test {
                        @testDeserializeAsJson()
                        public things!: { [idx: string]: number; }[];
                    }

                    const json = {
                        things: [
                            { x: 1, y: 3 },
                            { x: 2, y: 2 },
                            { x: 3, y: 1 }
                        ]
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        things: [
                            { x: 1, y: 3 },
                            { x: 2, y: 2 },
                            { x: 3, y: 1 }
                        ]
                    });
                });

                it("deserializes a map of primitives as json", () => {
                    class Test {
                        @testDeserializeAsJson()
                        public things!: { [idx: string]: number; };

                    }

                    const json = {
                        things: {
                            x: 1, y: 2, z: 3
                        }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        things: { x: 1, y: 2, z: 3 }
                    });
                });

                it("deserializes a map of non primitives as json", () => {
                    class Test {
                        @testDeserializeAsJson()
                        public things!: { [idx: string]: number; };

                    }

                    const json = {
                        things: {
                            v0: { x: 1, y: 3 },
                            v1: { x: 2, y: 2 },
                            v2: { x: 3, y: 1 }
                        }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        things: {
                            v0: { x: 1, y: 3 },
                            v1: { x: 2, y: 2 },
                            v2: { x: 3, y: 1 }
                        }
                    });
                });

                it("deserializes nested arrays", () => {
                    class Test {
                        @testDeserializeAsJson()
                        public things!: { [idx: string]: number; };

                    }

                    const json = {
                        things: [
                            [1, 2, 3],
                            [4, 5, 6]
                        ]
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        things: [
                            [1, 2, 3],
                            [4, 5, 6]
                        ]
                    });
                });

                it("does not deserialize functions", () => {
                    class Test {
                        @testDeserializeAsJson()
                        public things!: { [idx: string]: number; };

                    }

                    const json: { [idx: string]: Function | JsonType; } = {
                        things: [],
                        fn: () => { }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json as IJsonObject, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        things: []
                    });
                    expect((instance as unknown as typeof json).fn).toBeUndefined();
                });

                it("deserializes json with a different key", () => {
                    class Test {
                        @testDeserializeAsJson("something")
                        public things!: { [idx: string]: number; };

                    }

                    const json = {
                        something: {
                            x: 1, y: 2, z: 3
                        }
                    };
                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    expect(instance).toEqual({
                        things: { x: 1, y: 2, z: 3 }
                    });
                });

                it("applies key transforms by default", () => {
                    SetDeserializeKeyTransform((value) => {
                        return value.toUpperCase();
                    });

                    class Test {
                        @testDeserializeAsJson()
                        public value0!: string;
                        @testDeserializeAsJson()
                        public value1!: boolean;
                        @testDeserializeAsJson()
                        public value2!: number;
                    }

                    const json = {
                        VALUE0: "strValue",
                        VALUE1: true,
                        VALUE2: 100
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    SetDeserializeKeyTransform(null);
                    expect(instance).toEqual({
                        value0: "strValue",
                        value1: true,
                        value2: 100
                    });
                });

                it("applies key transforms when set to true", () => {
                    SetDeserializeKeyTransform((value) => {
                        return value.toUpperCase();
                    });

                    class Test {
                        @testDeserializeAsJson(true)
                        public value0!: string;
                        @testDeserializeAsJson(true)
                        public value1!: boolean;
                        @testDeserializeAsJson(true)
                        public value2!: number;
                    }

                    const json = {
                        VALUE0: "strValue",
                        VALUE1: true,
                        VALUE2: 100
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);
                    SetDeserializeKeyTransform(null);
                    expect(instance).toEqual({
                        value0: "strValue",
                        value1: true,
                        value2: 100
                    });
                });

                it("does not apply key transforms when set to false", () => {
                    SetDeserializeKeyTransform(null);

                    class Test {
                        @testDeserializeAsJson(true)
                        public value0!: string;
                        @testDeserializeAsJson(true)
                        public value1!: boolean;
                        @testDeserializeAsJson(true)
                        public value2!: number;
                    }

                    const json = {
                        VALUE0: "strValue",
                        VALUE1: true,
                        VALUE2: 100
                    };

                    const target = createTarget(makeTarget, instantiationMethod, Test);
                    const instance = Deserialize(json, () => Test, target, instantiationMethod);

                    expect(instance).toEqual({
                        value0: undefined,
                        value1: undefined,
                        value2: undefined
                    });
                });

            });
        }

        runTests("Normal > Create Instances > With Target",
        InstantiationMethod.New, deserializeAs, deserializeAsJson, true);
        runTests("Normal > Create Instances > Without Target",
        InstantiationMethod.New, deserializeAs, deserializeAsJson, false);
        runTests("Normal > No Instances > With Target",
        InstantiationMethod.None, deserializeAs, deserializeAsJson, true);
        runTests("Normal > No Instances > Without Target",
        InstantiationMethod.None, deserializeAs, deserializeAsJson, false);
        runTests("Auto > Create Instances > With Target",
        InstantiationMethod.New, autoserializeAs, autoserializeAsJson, true);
        runTests("Auto > Create Instances > Without Target",
        InstantiationMethod.New, autoserializeAs, autoserializeAsJson, false);
        runTests("Auto > No Instances > With Target",
        InstantiationMethod.None, autoserializeAs, autoserializeAsJson, true);
        runTests("Auto > No Instances > Without Target",
        InstantiationMethod.None, autoserializeAs, autoserializeAsJson, false);

    });

    describe("DeserializeUsing", () => {

        function runTests(blockName: string,
                          instantiationMethod: InstantiationMethod,
                          testDeserializeAs: Function,
                          testDeserializeUsing: Function,
                          makeTarget: boolean) {

            it("uses the provided function", () => {
                function x() { return 1; }

                class Test {
                    @testDeserializeUsing(x)
                    public value: number = 10;
                    @autoserializeUsing({ Serialize: x, Deserialize: x })
                    public value1!: string;
                }

                const json = {
                    value: "yes",
                    value1: "hello"
                };

                const target = createTarget(makeTarget, instantiationMethod, Test);
                const instance = Deserialize(json, () => Test, target, instantiationMethod);
                expectTarget(target, instance, makeTarget);
                expectInstance(instance, Test, instantiationMethod);
                expect(instance).toEqual({ value: 1, value1: 1 });

            });

        }

        runTests("Normal > Create Instances > With Target",
        InstantiationMethod.New, deserializeAs, deserializeUsing, true);
        runTests("Normal > Create Instances > Without Target",
        InstantiationMethod.New, deserializeAs, deserializeUsing, false);
        runTests("Normal > No Instances > With Target",
        InstantiationMethod.None, deserializeAs, deserializeUsing, true);
        runTests("Normal > No Instances > Without Target",
        InstantiationMethod.None, deserializeAs, deserializeUsing, false);

    });

    describe("onDeserialized", () => {

        it("invokes the handler if provided", () => {

            class Test {
                @deserializeAs(() => Number)
                public value: number = 1;
                public something!: string;

                @onDeserialized
                public someVoidFunction(): void {
                    this.something = "here";
                }
            }

            const json: IJsonObject = { value: 100 };
            const instance = Deserialize(json, () => Test, null, InstantiationMethod.New);
            expect(instance).toEqual({
                something: "here",
                value: 100
            });

        });

        it("accepts the return value of onDeserialized if provided", () => {

            class Test {
                @deserializeAs(() => Number)
                public value: number = 1;

                @onDeserialized
                public someVoidFunction(): void {
                    this.value = 300;
                }

            }

            class TestChild extends Test{
                @onDeserialized
                public someVoidFunction(): void {
                    this.value += 200;
                }
            }

            const json = { value: 100 };
            const instance = Deserialize(json, () => TestChild, null, InstantiationMethod.New);
            expect(instance).toEqual({
                value: 201
            });
        });

    });

    describe("InstantiationMethod", () => {

        it("New", () => {

            class Test {

                public constructed: boolean = false;

                constructor() {
                    this.constructed = true;
                }

            }

            const json = {};
            const instance = Deserialize(json, () => Test, null, InstantiationMethod.New);
            expect(instance).toEqual({
                constructed: true
            });

        });

        it("ObjectCreate", () => {

            class Test {

                public constructed: boolean;

                constructor() {
                    this.constructed = true;
                }

            }

            const json = {};
            const instance = Deserialize(json, () => Test, null, InstantiationMethod.ObjectCreate);
            expect(instance.constructed).toBeUndefined();

        });

        it("None", () => {

            class Test {
            }

            const json = {};
            const instance = Deserialize(json, () => Test, null, InstantiationMethod.None);
            expect(typeof instance).toEqual("object");
            expect(instance instanceof Test).toEqual(false);
        });

        it("SetDefaultInstantiationMethod", () => {
            SetDefaultInstantiationMethod(InstantiationMethod.None);

            class Test {
            }

            const json = {};
            const instance = Deserialize(json, () => Test, null, InstantiationMethod.None);

            SetDefaultInstantiationMethod(null); // Reset.

            expect(typeof instance).toEqual("object");
            expect(instance instanceof Test).toEqual(false);
        });

    });

    describe("Deserialize References and Cycle", () => {

        it("References", () => {

            class Test {
                @deserializeAsJson()
                public value: number = 10;
            }

            class Test0 {
                @deserializeAs(() => Test)
                public value0!: Test;
                @deserializeAs(() => Test)
                public value1!: Test;
            }
            const json = {
                $id: "1",
                value0: { $id: "2", value: 1 },
                value1: { $ref: "2" }
            };
            RefCycleDetectionEnable();
            const instance = Deserialize(json, () => Test0);
            RefClean();
            RefCycleDetectionDisable();
            expect(instance.value0).toBe(instance.value1);
        });

        it("ReferenceCycle = true, is reference = false", () => {
            class Test {
                @deserializeAsJson()
                public value: number = 10;
            }
            @isReference(false)
            class Test0 {
                @deserializeAs(() => Test)
                public value0!: Test;
                @deserializeAs(() => Test)
                public value1!: Test;
            }
            const json = {
                value0: { $id: "2", value: 1 },
                value1: { $ref: "2" }
            };
            RefCycleDetectionEnable();
            const instance = Deserialize(json, () => Test0);
            RefClean();
            RefCycleDetectionDisable();
            expect(instance.value0).toBe(instance.value1);
        });

        it("ReferenceCycle = false, is reference = true", () => {
            @isReference(true)
            class Test {
                @deserializeAsJson()
                public value: number = 10;
            }

            class Test0 {
                @deserializeAs(() => Test)
                public value0!: Test;
                @deserializeAs(() => Test)
                public value1!: Test;
            }
            const json = {
                value0: { $id: "2", value: 1 },
                value1: { $ref: "2" }
            };
            const instance = Deserialize(json, () => Test0);
            RefClean();
            expect(instance.value0).toBe(instance.value1);
        });

        it("Cycle length 3", () => {
            class Test {
                @deserializeAs(() => Test)
                public next!: Test | undefined;
            }
            const json: IJsonObject = {
                $id: "1",
                next: {
                    $id: "2",
                    next: {
                        $id: "3",
                        next: {
                            $ref: "1"
                        }
                    }
                }
            };
            RefCycleDetectionEnable();
            const instance = Deserialize(json, () => Test);
            RefClean();
            RefCycleDetectionDisable();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(instance).toBe(instance.next!.next!.next);
        });

        it("Cycle length 0", () => {

            class Test {
                @deserializeAs(() => Test)
                public next: Test | undefined;
            }
            const json = {
                $id: "1",
                next: {
                    $ref: "1"
                }
            };
            RefCycleDetectionEnable();
            const instance = Deserialize(json, () => Test);
            RefClean();
            RefCycleDetectionDisable();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(instance).toBe(instance.next!.next!.next);
        });

    });

    describe("RuntimeTyping serialization", () => {

        it("Array 1", () => {
            class Test0 {
                @deserializeAs(() => Number)
                public valueA: number = 0;
            }
            class Test1 extends Test0 {
                @deserializeAs(() => Number)
                public valueB: number = 1;
            }
            class Test2 extends Test1 {
                @deserializeAs(() => Number)
                public valueC: number = 2;
            }
            class Test3 extends Test1 {
                @deserializeAs(() => Number)
                public valueD: number = 3;
            }

            RuntimeTypingSetTypeString(Test0, "my Test0 type");
            RuntimeTypingSetTypeString(Test1, "my Test1 type");
            RuntimeTypingSetTypeString(Test2, "my Test2 type");
            RuntimeTypingSetTypeString(Test3, "my Test3 type");
            RuntimeTypingEnable();
            const json = DeserializeArray([
                { $type: "my Test0 type", valueA: 0 },
                { $type: "my Test1 type", valueB: 1 },
                { $type: "my Test2 type", valueC: 2 },
                { $type: "my Test3 type", valueD: 3 }
            ], () => Test0);
            RuntimeTypingResetDictionary();
            RuntimeTypingDisable();
            expect(json[0] instanceof Test0).toBeTruthy();
            expect(json[1] instanceof Test1).toBeTruthy();
            expect(json[2] instanceof Test2).toBeTruthy();
            expect(json[3] instanceof Test3).toBeTruthy();
        });

        it("Array 2", () => {
            class Test0 {
                @deserializeAs(() => Number)
                public valueA: number = 0;
            }
            class Test1 {
                @deserializeAs(() => Number)
                public valueB: number = 1;
            }
            class Test2 {
                @deserializeAs(() => Number)
                public valueC: number = 2;
            }
            class Test3 {
                @deserializeAs(() => Number)
                public valueD: number = 3;
            }

            class MyArray<T> extends Array<T> { }

            RuntimeTypingSetTypeString(Test0, "my Test0 type");
            RuntimeTypingSetTypeString(Test1, "my Test1 type");
            RuntimeTypingSetTypeString(Test2, "my Test2 type");
            RuntimeTypingSetTypeString(Test3, "my Test3 type");
            RuntimeTypingEnable();
            const json = Deserialize([
                { $type: "my Test0 type", valueA: 0 },
                { $type: "my Test1 type", valueB: 1 },
                { $type: "my Test2 type", valueC: 2 },
                { $type: "my Test3 type", valueD: 3 }
            ], itIsAnArray(() => Test0, () => MyArray));
            RuntimeTypingResetDictionary();
            RuntimeTypingDisable();
            expect(json[0] instanceof Test0).toBeTruthy();
            expect(json[1] instanceof Test1).toBeTruthy();
            expect(json[2] instanceof Test2).toBeTruthy();
            expect(json[3] instanceof Test3).toBeTruthy();
            expect(json).toEqual([
                { valueA: 0 },
                { valueB: 1 },
                { valueC: 2 },
                { valueD: 3 }
            ]);
        });

        it("Object", () => {
            class Test0 {
                @deserializeAs(() => Boolean)
                public valueA: boolean = true;
            }
            class Test1 {
                @deserializeAs(() => Boolean)
                public valueB: boolean = true;
            }
            @inheritSerialization(() => Test1)
            class Test2 extends Test1 {
            }
            class Test3 {
                @deserializeAs(() => Object)
                public m1!: Test0;
                @deserializeAs(() => Test2)
                public m2!: Test1;
            }

            const s = new Test3();
            s.m1 = new Test0();
            s.m2 = new Test2();
            RuntimeTypingSetTypeString(Test0, "my Test0 type");
            RuntimeTypingSetTypeString(Test1, "my Test1 type");
            RuntimeTypingSetTypeString(Test2, "my Test2 type");
            RuntimeTypingSetTypeString(Test3, "my Test3 type");
            RuntimeTypingEnable();
            const json = Deserialize({
                $type: "my Test3 type",
                m1: { $type: "my Test0 type", valueA: true },
                m2: { $type: "my Test2 type", valueB: true }
            }, () => Test3);
            RuntimeTypingResetDictionary();
            RuntimeTypingDisable();
            expect(json instanceof Test3).toBeTruthy();
            expect(json.m1 instanceof Test0).toBeTruthy();
            expect(json.m2 instanceof Test1).toBeTruthy();
        });

        it("Object InstantiationMethod.ObjectCreate", () => {
            class Test0 {
                @deserializeAs(() => Boolean)
                public valueA: boolean = true;
            }
            class Test1 {
                @deserializeAs(() => Boolean)
                public valueB: boolean = true;
            }
            @inheritSerialization(() => Test1)
            class Test2 extends Test1 {
            }
            class Test3 {
                @deserializeAs(() => Object)
                public m1!: Test0;
                @deserializeAs(() => Test2)
                public m2!: Test1;
            }

            const s = new Test3();
            s.m1 = new Test0();
            s.m2 = new Test2();
            RuntimeTypingSetTypeString(Test0, "my Test0 type");
            RuntimeTypingSetTypeString(Test1, "my Test1 type");
            RuntimeTypingSetTypeString(Test2, "my Test2 type");
            RuntimeTypingSetTypeString(Test3, "my Test3 type");
            RuntimeTypingEnable();
            const json = Deserialize({
                $type: "my Test3 type",
                m1: { $type: "my Test0 type", valueA: true },
                m2: { $type: "my Test2 type", valueB: true }
            }, () => Test3, null, InstantiationMethod.ObjectCreate);
            RuntimeTypingResetDictionary();
            RuntimeTypingDisable();
            expect(json instanceof Test3).toBeTruthy();
            expect(json.m1 instanceof Test0).toBeTruthy();
            expect(json.m2 instanceof Test1).toBeTruthy();
        });

    });

    describe("Accessor", () => {

        it("accessor get & set", () => {
            class Flag {
                private bp: number;
                constructor(n: number) {
                    this.bp = n;
                }
                @deserializeAs(() => Number, "bPrime")
                public get b() {
                    return this.bp + 1;
                }
                public set b(bp: number) {
                    this.bp = bp - 2;
                }
            }

            const json = Deserialize({ bPrime : 3 }, () => Flag);
            expect(json.b).toEqual(2);

        });

    });

    describe("Default Value", () => {
        it("Boolean", () => {
            class Test {
                @emitDefaultValue(false)
                @autoserializeAs(() => Boolean)
                public valueDefault!: boolean; // no json value, default value not set

                @emitDefaultValue(false)
                @autoserializeAs(() => Boolean)
                @defaultValue(true)
                public shouldBeFalse!: boolean; // no json value custom default value

                @autoserializeAs(() => Boolean)
                @defaultValue(true)
                @emitDefaultValue(false)
                public shouldBeTrue!: boolean; // json value provided
            }

            const json = {
                shouldBeFalse: false
            };
            const test = Deserialize(json, () => Test);
            expect(test.valueDefault).toBe(false);
            expect(test.shouldBeFalse).toBe(false);
            expect(test.shouldBeTrue).toBeTruthy();
        });

        it("Number", () => {
            class Test {
                @emitDefaultValue(false)
                @autoserializeAs(() => Number)
                public shouldBeO!: number; // no json value

                @emitDefaultValue(false)
                @autoserializeAs(() => Number)
                @defaultValue(2)
                public shouldBe2!: number; // no json value, custom default value

                @emitDefaultValue(false)
                @autoserializeAs(() => Number)
                @defaultValue(2)
                public shouldBe1!: number; // json value provided
            }

            const json = {
                shouldBe1: 1
            };
            const test = Deserialize(json, () => Test);
            expect(test.shouldBeO).toEqual(0);
            expect(test.shouldBe2).toEqual(2);
            expect(test.shouldBe1).toEqual(1);
        });

        it("Map", () => {
            class Test {
                @emitDefaultValue(false)
                @autoserializeAsMap(() => String, () => Number)
                public value!: Map<string, number>;
            }

            const json = {};
            const test = Deserialize(json, () => Test);
            expect(test.value).toBeNull();
        });

        it("Array", () => {
            class Test {
                @emitDefaultValue(false)
                @autoserializeAsArray(() => String)
                public value!: string[];
            }

            const json = {
                value: null
            };
            const test = Deserialize(json, () => Test);
            expect(test.value).toBeNull();
        });

        it("Object", () => {
            const elephant = {
                name: "babar"
            };
            const snake = {
                hasTail: true
            };
            class Test {
                @emitDefaultValue(false)
                @autoserializeAs(() => Object)
                public shouldBeNull!: Object; // no value provided in JSON nor default value

                @autoserializeAs(() => Object)
                public shouldBeUndefined!: Object; // emitDefaultValue === true

                @emitDefaultValue(false)
                @autoserializeAs(() => Object)
                @defaultValue(elephant)
                public shouldBeElephant!: Object; // no value provided in JSON

                @emitDefaultValue(false)
                @autoserializeAsJson()
                @defaultValue(elephant)
                public shouldBeSnake!: Object; // value provided in JSON
            }

            const json = {
                shouldBeSnake: snake
            };

            const test = Deserialize(json, () => Test);
            expect(test.shouldBeNull).toBeNull();
            expect(test.shouldBeUndefined).toBeUndefined();
            expect(test.shouldBeElephant).toBe(elephant);
            expect(test.shouldBeSnake).toEqual(snake);
        });
    });

    describe("extends", () => {
        it("Array", () => {
            class Tableau extends Array { }
            class Test {
                @autoserializeAsArray(() => Number, () => Tableau, "bPrime")
                public a: Tableau;

                constructor(...args: any[]){
                    this.a = new Tableau(...args);
                }
            }

            const json = Deserialize({ bPrime: [1, 2, 3]}, () => Test);
            expect(json.a).toEqual([1, 2, 3]);
            expect(json.a instanceof Tableau).toBeTruthy();
        });

        it("Set", () => {
            class Ensemble extends Set<number> { }
            class Test {
                @autoserializeAsSet(() => Number)
                public a: Set<number>;

                constructor(){
                    this.a = new Ensemble();
                }
            }

            const json = Deserialize({ a: [1, 2, 3]}, () => Test);
            expect(json.a.has(1)).toBeTruthy();
            expect(json.a.has(2)).toBeTruthy();
            expect(json.a.has(3)).toBeTruthy();
            expect(json.a.size).toEqual(3);
            expect(json.a instanceof Ensemble).toBeTruthy();
        });

        it("Map", () => {
            class Dictionnaire extends Map<number, number> { }
            class Test {
                @autoserializeAsMap(() => Number, () => Number, () => Dictionnaire)
                public a: Dictionnaire;

                constructor(){
                    this.a = new Dictionnaire();
                }
            }

            const json = Deserialize({ a: {1: 1, 2: 2, 3: 3}}, () => Test);
            expect(json.a.get(1)).toEqual(1);
            expect(json.a.get(2)).toEqual(2);
            expect(json.a.get(3)).toEqual(3);
            expect(json.a instanceof Dictionnaire).toBeTruthy();
        });
    });

    it("ordre of deserialization", () => {
        class A {
            public strHidden: string = "";
            @deserializeAs(() => String)
            public set a1(value: string) {
                this.strHidden += "A1";
            }
            @deserializeAs(() => String)
            public set a2(value: string) {
                this.strHidden += "A2";
            }
        }
        @inheritSerialization(() => A)
        class B extends A {
            @deserializeAs(() => String)
            public set b1(value: string) {
                this.strHidden += "B1";
            }
            @deserializeAs(() => String)
            public set b2(value: string) {
                this.strHidden += "B2";
            }
        }
        @inheritSerialization(() => B)
        class C extends B {
            @deserializeAs(() => String)
            public set c1(value: string) {
                this.strHidden += "C1";
            }
            @deserializeAs(() => String)
            public set c2(value: string) {
                this.strHidden += "C2";
            }
        }
        const json = {a1: "a1", a2: "a2", b1: "b1", b2: "b2", c1: "c1", c2: "c2"};
        const obj = Deserialize(json, () => C);
        expect(obj.strHidden).toEqual("A1A2B1B2C1C2");
    });

});
