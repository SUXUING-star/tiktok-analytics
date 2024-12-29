import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import * as XLSX from 'xlsx';

const DataPreprocessor = ({ onProcessedData }) => {
  const [processingStatus, setProcessingStatus] = useState('');
  const [preprocessedFiles, setPreprocessedFiles] = useState([]);

  const normalizeData = (data) => {
    const normalizedData = data.map(row => {
      const newRow = {};
      Object.entries(row).forEach(([key, value]) => {
        // 处理 NaN、null、undefined、空字符串
        if (value === null || value === undefined || value === '' || 
            (typeof value === 'number' && isNaN(value)) ||
            value === 'NaN' || value === 'nan' || value === '#N/A') {
          newRow[key] = 0;
          return;
        }

        // 处理日期
        if (value && typeof value === 'string' && value.includes('/')) {
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            newRow[key] = dateValue;
            return;
          }
        }
        
        // 处理百分比
        if (typeof value === 'string' && value.includes('%')) {
          const percentValue = parseFloat(value.replace('%', ''));
          newRow[key] = isNaN(percentValue) ? 0 : percentValue / 100;
          return;
        }
        
        // 处理数值字符串
        if (typeof value === 'string' && !isNaN(value)) {
          const numValue = parseFloat(value);
          newRow[key] = isNaN(numValue) ? 0 : numValue;
          return;
        }

        newRow[key] = value;
      });
      return newRow;
    });

    return normalizedData;
  };

  const getFileType = (fileName) => {
    // 转换为小写并移除可能的时间戳和扩展名
    const cleanName = fileName.toLowerCase().replace(/[_-]\d+.*\.xlsx?$/, '');
    
    if (cleanName.includes('overview') || cleanName.includes('business performance')) {
      return { type: 'total', newName: 'total.xlsx' };
    }
    if (cleanName.includes('product card traffic')) {
      return { type: 'producttotal', newName: 'producttotal.xlsx' };
    }
    if (cleanName.includes('products card list')) {
      return { type: 'products', newName: 'products.xlsx' };
    }
    return { type: 'unknown', newName: 'unknown.xlsx' };
  };

  const processFile = async (file) => {
    try {
      setProcessingStatus(`正在处理 ${file.name}...`);
      
      // 确定文件类型和对应的新文件名
      const { type, newName } = getFileType(file.name);
      
      // 根据文件类型确定起始行
      let headerRow = 0;
      if (type === 'total') {
        headerRow = 4; // 从第5行开始
      } else if (type === 'producttotal' || type === 'products') {
        headerRow = 2; // 从第3行开始
      }
      
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        cellNF: true,
        cellStyles: true
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
        range: headerRow  // 设置起始行
      });
      
      // 数据标准化
      const normalizedData = normalizeData(jsonData);
      
      // 生成新的工作簿
      const newWorkbook = XLSX.utils.book_new();
      const newWorksheet = XLSX.utils.json_to_sheet(normalizedData, {
        dateNF: 'yyyy-mm-dd',
        cellDates: true,
        bookSST: false
      });

      // 设置列宽
      const colWidths = {};
      Object.keys(normalizedData[0] || {}).forEach(key => {
        colWidths[key] = { wch: Math.max(key.length * 1.5, 12) };
      });
      newWorksheet['!cols'] = Object.values(colWidths);

      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
      
      // 生成文件
      XLSX.writeFile(newWorkbook, newName);
      
      // 更新处理状态
      setProcessedFile(newName);
      setProcessingStatus(`文件已处理完成，已保存为 ${newName}`);

      return normalizedData;
    } catch (error) {
      setProcessingStatus(`处理文件时出错: ${error.message}`);
      console.error('Error processing file:', error);
      return null;
    }
  };

  const setProcessedFile = (fileName) => {
    setPreprocessedFiles([fileName]);
  };

  return (
    <Card className="w-full mb-6 shadow-custom-card">
      <CardHeader>
        <CardTitle>数据预处理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            此功能将自动进行以下处理：
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>自动识别文件类型并选择合适的起始行</li>
            <li>数据格式标准化</li>
            <li>空值和NaN值处理</li>
            <li>日期格式统一</li>
            <li>百分比转换</li>
          </ul>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">上传文件进行预处理:</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                processFile(file);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                     file:rounded-md file:border-0 file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {processingStatus && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">{processingStatus}</p>
          </div>
        )}

        {preprocessedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">已处理的文件:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {preprocessedFiles.map((fileName, index) => (
                <li key={index}>{fileName}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataPreprocessor;