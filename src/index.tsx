import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { map } from 'lodash';
import firebase from 'firebase/app';
import 'firebase/storage';

interface Props {
    storage: firebase.storage.Storage;
    folderName?: string;
    accept: string;
    randomName?: true;
    hidden?: true;
    multiple?: true;
    onUploadingStart: () => void;
    onUploadSuccess: (uploaded: UploadingFile) => void;
    uploadingFiles?: (uploaded: UploadingFile) => void;
}

type UploadingFile = { [id: string]: { file: File; storagePath: string; donwloadUrl: string; progress: number } };
type UploadedFiles = UploadingFile & { sucsses: boolean };

export const FirebaseFilesUploader = (props: Props) => {
    const {
        accept,
        onUploadSuccess,
        onUploadingStart,
        uploadingFiles,
        storage,
        hidden,
        multiple,
        randomName,
        folderName,
    } = props;

    async function uploadFiles(files: FileList) {
        let selectedFiles: UploadingFile | undefined = undefined;

        if (uploadingFiles !== undefined) {
            if (!selectedFiles) {
                return;
            }
            uploadingFiles(selectedFiles);
        }

        onUploadingStart();

        await Promise.all(
            map(files, async (file: File) => {
                const generatedId = uuidv4();

                const fileName = randomName ? generatedId : file.name;

                let url = '';

                const child = `${folderName + '/'}${fileName}`;

                const uploadTask = storage.ref().child(child).put(file, { contentType: file.type });

                const getFileObj = () => {
                    return {
                        [generatedId]: { file, progress: 0, donwloadUrl: url, storagePath: `${child}` },
                    } as UploadingFile;
                };

                selectedFiles = selectedFiles !== undefined ? { ...selectedFiles, ...getFileObj() } : getFileObj();

                try {
                    uploadTask.on(
                        firebase.storage.TaskEvent.STATE_CHANGED,
                        (snapshot: any) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);

                            selectedFiles = {
                                ...(selectedFiles ?? {}),
                                [generatedId]: {
                                    file,
                                    progress: progress,
                                    donwloadUrl: url,
                                    storagePath: `${child}`,
                                },
                            };
                        },
                        (error: any) => {
                            throw new Error(error.message);
                        },
                    );

                    await uploadTask;

                    url = await storage.ref(folderName).child(fileName).getDownloadURL();

                    const withUrl = {
                        ...selectedFiles,
                        [generatedId]: { file, donwloadUrl: url, progress: 100, storagePath: `${child}` },
                    };

                    selectedFiles = withUrl;
                } catch (e) {
                    console.error(e);
                    throw new Error(e);
                }

                await uploadTask;

                return selectedFiles;
            }),
        ).then(() => {
            if (!selectedFiles) {
                return;
            }
            onUploadSuccess(selectedFiles);
        });
    }

    return (
        <label>
            <input
                accept={accept}
                hidden={hidden}
                type="file"
                multiple={multiple}
                onChange={(e) => {
                    uploadFiles(e.target.files as FileList);
                }}
            />
        </label>
    );
};
