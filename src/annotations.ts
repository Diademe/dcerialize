import { MetaData, MetaDataFlag } from "./meta_data";
import {
    IConstructable,
    ISerializer,
    isPrimitiveType,
    SerializableType,
    SerializeFn,
    setBitConditionally
} from "./util";

// set a bitmask B. during compilation, if B & x, then the member will be serialized
export function serializeBitMask(bitMask: number): any {
    return function(target: any, actualKeyName: string): any {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.bitMaskSerialize = bitMask;
    };
}

export function serializeUsing(serializer: SerializeFn, keyName?: string) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.serializedKey = keyName ? keyName : actualKeyName;
        metadata.serializedType = serializer as any;
        metadata.flags |= MetaDataFlag.SerializeUsing;
    };
}

export function serializeAs(type: SerializableType<any>, keyName?: string) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.serializedKey = keyName ? keyName : actualKeyName;
        metadata.serializedType = type;
        metadata.flags |= MetaDataFlag.SerializeObject;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.SerializePrimitive,
            isPrimitiveType(type)
        );
    };
}

export function serializeAsArray<T>(
    type: SerializableType<T>,
    keyName?: string
) {
    return function(target: any, actualKeyName: string): any {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.serializedKey = keyName ? keyName : actualKeyName;
        metadata.serializedType = type;
        metadata.flags |= MetaDataFlag.SerializeArray;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.SerializePrimitive,
            isPrimitiveType(type)
        );
    };
}

export function serializeAsObjectMap<T>(type: SerializableType<T>, keyName?: string) {
    return function(target: any, actualKeyName: string): any {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.serializedKey = keyName ? keyName : actualKeyName;
        metadata.serializedType = type;
        metadata.flags |= MetaDataFlag.SerializeObjectMap;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.SerializePrimitive,
            isPrimitiveType(type)
        );
    };
}

export function serializeAsMap(
    keyType: SerializableType<any>,
    valueType: SerializableType<any>,
    constructor?: SerializableType<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.serializedKey = keyName ? keyName : actualKeyName;
        metadata.serializedType = constructor ? constructor : Map;
        metadata.serializedKeyMapType = keyType;
        metadata.serializedValueMapType = valueType;
        metadata.flags |= MetaDataFlag.SerializeMap;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.SerializePrimitive,
            isPrimitiveType(valueType)
        );
    };
}

export function serializeAsJson(
    keyNameOrTransformKeys?: boolean | string,
    transformKeys = true
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.serializedKey =
            typeof keyNameOrTransformKeys === "string"
                ? keyNameOrTransformKeys
                : actualKeyName;
        metadata.flags |= MetaDataFlag.SerializeJSON;
        const shouldTransformKeys =
            typeof keyNameOrTransformKeys === "boolean"
                ? keyNameOrTransformKeys
                : transformKeys;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.SerializeJSONTransformKeys,
            shouldTransformKeys
        );
    };
}

export function deserializeUsing(serializer: SerializeFn, keyName?: string) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.deserializedKey = keyName ? keyName : actualKeyName;
        metadata.deserializedType = serializer as any;
        metadata.flags |= MetaDataFlag.DeserializeUsing;
    };
}

export function deserializeAs(type: SerializableType<any>, keyName?: string) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.deserializedKey = keyName ? keyName : actualKeyName;
        metadata.deserializedType = type;
        metadata.flags |= MetaDataFlag.DeserializeObject;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.DeserializePrimitive,
            isPrimitiveType(type)
        );
    };
}

export function deserializeAsArray(
    type: SerializableType<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.deserializedKey = keyName ? keyName : actualKeyName;
        metadata.deserializedType = type;
        metadata.flags |= MetaDataFlag.DeserializeArray;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.DeserializePrimitive,
            isPrimitiveType(type)
        );
    };
}

export function deserializeAsMap(
    keyType: SerializableType<any>,
    valueType: SerializableType<any>,
    constructor?: SerializableType<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.deserializedKey = keyName ? keyName : actualKeyName;
        metadata.deserializedType = constructor ? constructor : Map;
        metadata.deserializedKeyMapType = keyType;
        metadata.deserializedValueMapType = valueType;
        metadata.flags |= MetaDataFlag.DeserializeMap;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.DeserializePrimitive,
            isPrimitiveType(valueType)
        );
    };
}

export function deserializeAsObjectMap(
    type: SerializableType<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.deserializedKey = keyName ? keyName : actualKeyName;
        metadata.deserializedType = type;
        metadata.flags |= MetaDataFlag.DeserializeObjectMap;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.DeserializePrimitive,
            isPrimitiveType(type)
        );
    };
}

export function deserializeAsJson(
    keyNameOrTransformKeys?: boolean | string,
    transformKeys = true
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.deserializedKey =
            typeof keyNameOrTransformKeys === "string"
                ? keyNameOrTransformKeys
                : actualKeyName;
        metadata.flags |= MetaDataFlag.DeserializeJSON;
        const shouldTransformKeys =
            typeof keyNameOrTransformKeys === "boolean"
                ? keyNameOrTransformKeys
                : transformKeys;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.DeserializeJSONTransformKeys,
            shouldTransformKeys
        );
    };
}

export function autoserializeUsing(
    serializer: ISerializer<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        const key = keyName ? keyName : actualKeyName;
        metadata.serializedKey = key;
        metadata.deserializedKey = key;
        metadata.serializedType = serializer.Serialize as any;
        metadata.deserializedType = serializer.Deserialize as any;
        metadata.flags |= MetaDataFlag.AutoUsing;
    };
}

export function autoserializeAs(type: SerializableType<any>, keyName?: string) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        const key = keyName ? keyName : actualKeyName;
        metadata.deserializedKey = key;
        metadata.serializedKey = key;
        metadata.deserializedType = type;
        metadata.serializedType = type;
        metadata.flags |=
            MetaDataFlag.SerializeObject | MetaDataFlag.DeserializeObject;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.AutoPrimitive,
            isPrimitiveType(type)
        );
    };
}

export function autoserializeAsArray(
    type: SerializableType<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        const key = keyName ? keyName : actualKeyName;
        metadata.deserializedKey = key;
        metadata.serializedKey = key;
        metadata.deserializedType = type;
        metadata.serializedType = type;
        metadata.flags |=
            MetaDataFlag.SerializeArray | MetaDataFlag.DeserializeArray;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.AutoPrimitive,
            isPrimitiveType(type)
        );
    };
}

export function autoserializeAsObjectMap(
    type: SerializableType<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        const key = keyName ? keyName : actualKeyName;
        metadata.deserializedKey = key;
        metadata.serializedKey = key;
        metadata.deserializedType = type;
        metadata.serializedType = type;
        metadata.flags |=
            MetaDataFlag.SerializeObjectMap | MetaDataFlag.DeserializeObjectMap;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.AutoPrimitive,
            isPrimitiveType(type)
        );
    };
}

export function autoserializeAsMap(
    keyType: SerializableType<any>,
    valueType: SerializableType<any>,
    constructor?: SerializableType<any>,
    keyName?: string
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaDataMap(
            keyType,
            valueType,
            actualKeyName
        );
        const key = keyName ? keyName : actualKeyName;
        metadata.deserializedKey = key;
        metadata.serializedKey = key;
        metadata.deserializedType = constructor ? constructor : Map;
        metadata.serializedType = constructor ? constructor : Map;
        metadata.serializedKeyMapType = keyType;
        metadata.serializedValueMapType = valueType;
        metadata.deserializedKeyMapType = keyType;
        metadata.deserializedValueMapType = valueType;
        metadata.flags |=
            MetaDataFlag.SerializeMap | MetaDataFlag.DeserializeMap;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.AutoPrimitive,
            isPrimitiveType(keyType)
        );
    };
}

export function autoserializeAsJson(
    keyNameOrTransformKeys?: boolean | string,
    transformKeys = true
) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        const key =
            typeof keyNameOrTransformKeys === "string"
                ? keyNameOrTransformKeys
                : actualKeyName;
        const shouldTransformKeys =
            typeof keyNameOrTransformKeys === "boolean"
                ? keyNameOrTransformKeys
                : transformKeys;
        metadata.deserializedKey = key;
        metadata.serializedKey = key;
        metadata.flags |=
            MetaDataFlag.SerializeJSON | MetaDataFlag.DeserializeJSON;
        metadata.flags = setBitConditionally(
            metadata.flags,
            MetaDataFlag.AutoJSONTransformKeys,
            shouldTransformKeys
        );
    };
}

export function inheritSerialization(parentType: IConstructable) {
    return function(childType: Function) {
        MetaData.inheritMetaData(parentType, childType);
    };
}

export function emitDefaultValue(emitDefaultValue: boolean) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.emitDefaultValue = emitDefaultValue;
    };
}

export function defaultValue(instance: IConstructable) {
    return function(target: IConstructable, actualKeyName: string): void {
        const metadata = MetaData.getMetaData(
            target.constructor,
            actualKeyName
        );
        metadata.defaultValue = instance;
    };
}
