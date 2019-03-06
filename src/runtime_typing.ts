import { IConstructable } from "./types";
import { getConstructor } from "./utils";
export { TypeString };
// throw an exception if dic doesn't have key
function lousyGet(dic: any, key: any) {
    const res = dic.get(key);
    if (res === undefined) {
        throw new Error(`The dictionary doesn't have the key ${key}`);
    }
    else {
        return res;
    }
}

export class TypeStringDictionary {
    private type2string: Map<IConstructable, string>;
    private string2type: Map<string, IConstructable>;
    private runtimeTyping: boolean = false;

    public constructor() {
        this.init();
    }
    public setTypeString(t: any, s: string): void {
        this.type2string.set(getConstructor(t), s);
        this.string2type.set(s, getConstructor(t));
    }
    public getStringFromType(instance: IConstructable): string {
        return lousyGet(this.type2string, getConstructor(instance));
    }
    public hasStringFromType(instance: IConstructable): boolean {
        return this.type2string.has(getConstructor(instance));
    }
    public getTypeFromString(s: string): IConstructable {
        return lousyGet(this.string2type, s);
    }
    public hasTypeFromString(s: string): boolean {
        return this.string2type.has(s);
    }
    public resetDictionary(): void {
        this.init();
    }
    public setRuntimeTyping(rtt: boolean) {
        this.runtimeTyping = rtt;
    }
    public getRuntimeTyping(): boolean {
        return this.runtimeTyping;
    }

    private init(): void {
        this.type2string = new Map<IConstructable, string>();
        this.string2type = new Map<string, IConstructable>();
    }
}
const TypeString: TypeStringDictionary = new TypeStringDictionary();

export function RuntimeTypingResetDictionary() {
    TypeString.resetDictionary();
}

export function RuntimeTypingSetTypeString(t: any, s: string): void {
    TypeString.setTypeString(t, s);
}

export function RuntimeTypingEnable(): void {
    TypeString.setRuntimeTyping(true);
}

export function RuntimeTypingDisable(): void {
    TypeString.setRuntimeTyping(false);
}

export function typeString(type: string) {
    return (classType: Function) => {
        TypeString.setTypeString(getConstructor(classType), type);
    };
}
