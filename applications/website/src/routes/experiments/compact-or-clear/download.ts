/** Saves text as a file by clicking a temporary object-URL link. Nothing is modified in place. */
export const downloadText = (fileName: string, contents: string, type: string): void => {
  const address = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');

  link.href = address;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(address), 1000);
};
