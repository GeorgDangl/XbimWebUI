export declare class xTriangulatedShape {
    parse(binReader: any): void;
    load: (source: any) => void;
    vertices: any[];
    indices: Uint32Array;
    normals: Uint8Array;
    onloaded(): void;
}
