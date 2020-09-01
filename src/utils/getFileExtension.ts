export function getFileExtension(filename: string) {
    const ext = filename.split('.').pop();
    if (ext == filename) return '';
    return ext;
}
