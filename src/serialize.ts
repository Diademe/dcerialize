import {
    isDefaultValue,
    MetaData,
    MetaDataFlag
} from "./meta_data";
import { cycleBreaking } from "./ref_cycle";
import { TypeString } from "./runtime_typing";
import {
    ASerializableType,
    ASerializableTypeOrArray,
    Indexable,
    ItIsAnArrayInternal,
    JsonObject,
    JsonType,
    primitive,
    SerializablePrimitiveType,
    SerializableType
} from "./types";

import {
    DowncastPrimitive,
    isPrimitiveType
} from "./utils";

let serializeBitMaskPrivate = Number.MAX_SAFE_INTEGER;

export function SelectiveSerialization(
    bitMask: number = Number.MAX_SAFE_INTEGER
) {
    serializeBitMaskPrivate = bitMask;
}

export function SerializeObjectMap<T>(
    source: T,
    type: ASerializableTypeOrArray<T>
): Indexable<JsonType> {
    if (source === null || source === undefined) {
        return null;
    }
    const target: Indexable<JsonType> = {};
    const keys = Object.keys(source);

    if (cycleBreaking(target, source)) {
        return target;
    }

    if (type instanceof ItIsAnArrayInternal) {
        if (TypeString.getRuntimeTyping()) {
            target.$type = TypeString.getStringFromType(source.constructor);
        }
    }
    else {
        if (TypeString.getRuntimeTyping() && !isPrimitiveType(type())) {
            target.$type = TypeString.getStringFromType(source.constructor);
        }

        for (const key of keys) {
            const value = (source as any)[key];
            if (value !== undefined) {
                target[MetaData.serializeKeyTransform(key)] = Serialize(
                    value,
                    type
                );
            }
        }
    }

    return target;
}

export function SerializeMap<K, V>(
    source: Map<K, V>,
    keyType: ASerializableTypeOrArray<K>,
    valueType: ASerializableTypeOrArray<V>,
): Indexable<JsonType> {
    if (source === null || source === undefined) {
        return null;
    }
    const target: Indexable<JsonType> = {};
    const keys = source.keys();

    if (cycleBreaking(target, source)) {
        return target;
    }

    if (TypeString.getRuntimeTyping()) {
        target.$type = TypeString.getStringFromType(source.constructor);
    }

    for (const key of keys) {
        const value = source.get(key);
        if (value !== undefined) {
            let targetKey: string | K | JsonType[];
            if (keyType instanceof ItIsAnArrayInternal) {
                targetKey = SerializeArray(key as any, keyType.type);
            }
            else {
                const keyTypeF = keyType() as Function;
                const isString = keyTypeF === String;
                targetKey = isString ? MetaData.serializeKeyTransform(key as any) : key;
            }
            const targetValue = Serialize(
                    value,
                    valueType as any
                );
            target[targetKey as any] = targetValue;
        }
    }

    return target;
}

export function SerializeArray<T>(
    source: T[],
    type: ASerializableTypeOrArray<T>
): JsonType[] {
    if (source === null || source === undefined) {
        return null;
    }
    const returnValue = new Array<JsonType>(source.length);
    for (let i = 0; i < source.length; i++) {
        returnValue[i] = Serialize(source[i], type as any);
    }
    return returnValue;
}

export function SerializeSet<T>(
    source: T[],
    type: ASerializableTypeOrArray<T>
): JsonType[] {
    return SerializeArray(Array.from(source.values()), type);
}

export function SerializePrimitive<T>(
    source: SerializablePrimitiveType,
    type: () => SerializablePrimitiveType
): JsonType {
    if (source === null || source === undefined) {
        return null;
    }

    const primitiveSource: primitive =
        source instanceof Object ? DowncastPrimitive(source) : source as primitive;

    if (type() === String) {
        return String(primitiveSource);
    }

    if (type() === Boolean) {
        return Boolean(primitiveSource);
    }

    if (type() === Number) {
        const val = Number(primitiveSource);
        return isNaN(val as any) && !Number.isNaN(val as any) ?
            null : val;
    }

    if (type() === Date) {
        return primitiveSource.valueOf();
    }

    if (type() === RegExp) {
        return primitiveSource.toString();
    }

    return primitiveSource.toString();
}

export function SerializeJSON(source: any, transformKeys = true): JsonType {
    if (source === null || source === undefined) {
        return null;
    }

    if (Array.isArray(source)) {
        const array = new Array<any>(source.length);
        for (let i = 0; i < source.length; i++) {
            array[i] = SerializeJSON(source[i], transformKeys);
        }
        return array;
    }

    const type = typeof source;

    if (type === "object") {
        if (source instanceof Date || source instanceof RegExp) {
            return source.toString();
        } else {
            const returnValue: Indexable<JsonType> = {};
            const keys = Object.keys(source);
            for (const key of keys) {
                const value = source[key];
                if (value !== undefined) {
                    const returnValueKey = transformKeys
                        ? MetaData.serializeKeyTransform(key)
                        : key;
                    returnValue[returnValueKey] = SerializeJSON(value, transformKeys);
                }
            }
            return returnValue;
        }
    } else if (type === "function") {
        return null;
    }

    return source;
}
export function Serialize<T>(instance: T, type: ItIsAnArrayInternal): JsonType[];
export function Serialize<T>(instance: T, type: ASerializableType<T>): JsonObject;
export function Serialize<T>(
    instance: T,
    type: ASerializableTypeOrArray<T>
): null | JsonType[] | JsonObject {
    if (instance === undefined || instance === null) {
        return null;
    }

    const target: Indexable<JsonType> = {};

    if (type instanceof ItIsAnArrayInternal) {
        const a = SerializeArray(instance as any, type.type);
        return a;
    }
    else {
        if (TypeString.getRuntimeTyping() && !isPrimitiveType(type())) {
            target.$type = TypeString.getStringFromType(instance.constructor);
            type = () => (instance.constructor as SerializableType<T>);
        }

        const metadataList = MetaData.getMetaDataForType(type());

        // todo -- maybe move this to a Generic deserialize
        if (metadataList === null) {
            if (isPrimitiveType(type())) {
                return SerializePrimitive(instance as any, type as any) as any;
            } else {
                return target;
            }
        }

        if (cycleBreaking(target, instance)) {
            return target;
        }

        for (const metadata of metadataList) {
            if (!(metadata.bitMaskSerialize & serializeBitMaskPrivate)) {
                continue;
            }

            if (metadata.serializedKey === null) {
                continue;
            }

            const source = (instance as any)[metadata.keyName];

            if (source === undefined) {
                continue;
            }

            const keyName = metadata.getSerializedKey();
            const flags = metadata.flags;

            if ((flags & MetaDataFlag.SerializeMap) !== 0) {
                const val = SerializeMap(source,
                    metadata.serializedKeyType,
                    metadata.serializedValueType,
                );
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            } else if ((flags & MetaDataFlag.SerializeObjectMap) !== 0) {
                const val = SerializeObjectMap(source, metadata.serializedType);
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            } else if ((flags & MetaDataFlag.SerializeSet) !== 0) {
                const val = SerializeSet(source, metadata.serializedKeyType);
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            } else if ((flags & MetaDataFlag.SerializeArray) !== 0) {
                const val = SerializeArray(source, metadata.serializedKeyType);
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            } else if ((flags & MetaDataFlag.SerializePrimitive) !== 0) {
                const val = SerializePrimitive(
                    source,
                    metadata.serializedType as () => SerializablePrimitiveType
                );
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            } else if ((flags & MetaDataFlag.SerializeObject) !== 0) {
                const val = Serialize(source, metadata.serializedType as any);
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            } else if ((flags & MetaDataFlag.SerializeJSON) !== 0) {
                const val = SerializeJSON(
                    source,
                    (flags & MetaDataFlag.SerializeJSONTransformKeys) !== 0
                );
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            } else if ((flags & MetaDataFlag.SerializeUsing) !== 0) {
                const val = (metadata.serializedType as any)(source);
                if (isDefaultValue(metadata, source)) {
                    continue;
                }
                target[keyName] = val;
            }
        }

        if (typeof type().onSerialized === "function") {
            const value = type().onSerialized(target, instance);
            if (value !== undefined) {
                return value as JsonObject;
            }
        }
        return target;
    }
}
