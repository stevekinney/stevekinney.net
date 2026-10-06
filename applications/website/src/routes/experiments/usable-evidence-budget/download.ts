/** Saves a blob as a file by clicking a temporary object-URL link. */
export const downloadBlob = (fileName: string, blob: Blob): void => {
  const address = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = address;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(address), 1000);
};

export const downloadText = (fileName: string, contents: string, type: string): void =>
  downloadBlob(fileName, new Blob([contents], { type }));
