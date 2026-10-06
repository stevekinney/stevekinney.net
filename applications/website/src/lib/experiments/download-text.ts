/** Saves text as a file through the browser's download, such as an exported SKILL.md. */
export const downloadText = (fileName: string, text: string, type = 'text/plain'): void => {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
