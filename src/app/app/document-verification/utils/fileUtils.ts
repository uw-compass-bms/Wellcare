// 文件转换为base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 计算文件统计信息
export const calculateFileStats = (
  singleFiles: Record<'quote' | 'application', { file: File | null; status: string; needsProcessing?: boolean }>,
  multiFiles: Record<'mvr' | 'autoplus', Array<{ needsProcessing?: boolean; status: string }>>
) => {
  let totalFiles = 0;
  let pendingFiles = 0;
  let processedFiles = 0;
  let errorFiles = 0;

  // 统计单文件
  Object.values(singleFiles).forEach(fileData => {
    if (fileData.file) {
      totalFiles++;
      if (fileData.needsProcessing) pendingFiles++;
      if (fileData.status === 'processed') processedFiles++;
      if (fileData.status === 'error') errorFiles++;
    }
  });

  // 统计多文件
  Object.values(multiFiles).forEach(files => {
    files.forEach(f => {
      totalFiles++;
      if (f.needsProcessing) pendingFiles++;
      if (f.status === 'processed') processedFiles++;
      if (f.status === 'error') errorFiles++;
    });
  });

  return { totalFiles, pendingFiles, processedFiles, errorFiles };
}; 