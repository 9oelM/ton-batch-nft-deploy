export type PinataArtifact = {
    images: string;
    metadata: string;
};

export function isPinataArtifact(obj: any, _argumentName?: string): obj is PinataArtifact {
    return obj.images !== undefined && obj.metadata !== undefined && typeof obj.images === 'string' && typeof obj.metadata === 'string';
}
