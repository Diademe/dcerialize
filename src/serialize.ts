import { Indexable, isPrimitiveType, JsonObject, JsonType, SerializablePrimitiveType, SerializableType } from "./util";
import { MetaData, MetaDataFlag } from "./meta_data";
import { cycleBreaking } from "./ref_cycle";
import { TypeString } from "./runtime_typing";

var serializeBitMask_ = Number.MAX_SAFE_INTEGER;

export function SelectiveSerialization(bitMask: number = Number.MAX_SAFE_INTEGER) {
    serializeBitMask_ = bitMask;
}

export function SerializeMap<T>(source: T, type: SerializableType<T>): Indexable<JsonType> {
    const target: Indexable<JsonType> = {};
    const keys = Object.keys(source);

    if (cycleBreaking(target, source)) {
        return target;
    }

    if (TypeString.getRuntimeTyping()) {
        target["$type"] = TypeString.getStringFromType(source.constructor);
    }

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = (source as any)[key];
        if (value !== void 0) {
            target[MetaData.serializeKeyTransform(key)] = Serialize(value, type);
        }
    }

    return target;
}

export function SerializeArray<T>(source: Array<T>, type: SerializableType<T>): Array<JsonType> {
    var json: any = {};
    if (cycleBreaking(json, source)) {
        return json;
    }
    const retn = new Array<JsonType>(source.length);
    for (let i = 0; i < source.length; i++) {
        retn[i] = Serialize(source[i], type);
    }
    return retn;
}

export function SerializePrimitive<T>(source: SerializablePrimitiveType, type: SerializablePrimitiveType): JsonType {

    if (source === null || source === void 0) {
        return null;
    }

    if (type === String) return source.toString();

    if (type === Boolean) return Boolean(source);

    if (type === Number) {
        const value = Number(source);
        if (isNaN(value)) return null;
        return value;
    }

    if (type === Date) return source.toString();

    if (type === RegExp) return source.toString();

    return source.toString();

}

export function SerializeJSON(source: any, transformKeys = true): JsonType {
    if (source === null || source === void 0) return null;

    var json: any = {};
    if (cycleBreaking(json, source)) {
        return json;
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
        }
        else {
            const retn: Indexable<JsonType> = {};
            if (cycleBreaking(retn, source)) {
                return retn;
            }
            const keys = Object.keys(source);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const value = source[key];
                if (value !== void 0) {
                    const retnKey = transformKeys ? MetaData.serializeKeyTransform(key) : key;
                    retn[retnKey] = SerializeJSON(value, transformKeys);
                }
            }
            return retn;
        }

    }
    else if (type === "function") {
        return null;
    }

    return source;
}

export function Serialize<T>(instance: T, type: SerializableType<T>): JsonObject | null {

    if (instance === void 0 || instance === null) {
        return null;
    }

    const target: Indexable<JsonType> = {};

    if (TypeString.getRuntimeTyping()) {
        target["$type"] = TypeString.getStringFromType(instance.constructor);
        type = instance.constructor as SerializableType<T>;
    }

    const metadataList = MetaData.getMetaDataForType(type);

    // todo -- maybe move this to a Generic deserialize
    if (metadataList === null) {
        if (isPrimitiveType(type)) {
            return SerializePrimitive(instance as any, type as any) as any;
        }
        else {
            return target;
        }
    }

    if (cycleBreaking(target, instance)) {
        return target;
    }

    for (let i = 0; i < metadataList.length; i++) {
        const metadata = metadataList[i];

        if (!(metadata.bitMaskSerialize & serializeBitMask_)) continue;

        if (metadata.serializedKey === null) continue;

        const source = (instance as any)[metadata.keyName];

        if (source === void 0) continue;

        const keyName = metadata.getSerializedKey();
        const flags = metadata.flags;

        if ((flags & MetaDataFlag.SerializeMap) !== 0) {
            let val = SerializeMap(source, metadata.serializedType);
            if(defaultValue(metadata, val)) continue;
            target[keyName] = val;
        }
        else if ((flags & MetaDataFlag.SerializeArray) !== 0) {
            let val = SerializeArray(source, metadata.serializedType);
            if(defaultValue(metadata, val)) continue;
            target[keyName] = val;
        }
        else if ((flags & MetaDataFlag.SerializePrimitive) !== 0) {
            let val = SerializePrimitive(source, metadata.serializedType as SerializablePrimitiveType);
            if(defaultValue(metadata, val)) continue;
            target[keyName] = val;
        }
        else if ((flags & MetaDataFlag.SerializeObject) !== 0) {
            let val = Serialize(source, metadata.serializedType);
            if(defaultValue(metadata, val)) continue;
            target[keyName] = val;
        }
        else if ((flags & MetaDataFlag.SerializeJSON) !== 0) {
            let val = SerializeJSON(source, (flags & MetaDataFlag.SerializeJSONTransformKeys) !== 0);
            if(defaultValue(metadata, val)) continue;
            target[keyName] = val;
        }
        else if ((flags & MetaDataFlag.SerializeUsing) !== 0) {
            let val = (metadata.serializedType as any)(source)
            if(defaultValue(metadata, val)) continue;
            target[keyName] = val;
        }

    }

    if (typeof type.onSerialized === "function") {
        const value = type.onSerialized(target, instance);
        if (value !== void 0) {
            return value as JsonObject;
        }
    }

    return target;
}

function defaultValue (metadata:MetaData, val:any){
    if(metadata.emitDefaultValue == false){
        if(metadata.DefaultValue !== null){
            return val === metadata.DefaultValue;
        }
        else {
            return new metadata.serializedType() == val;
        }
    }
    return false;
}