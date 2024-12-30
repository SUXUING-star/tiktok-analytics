// src/components/ExcelPreview.jsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ExcelPreview = () => {
  const [excelData, setExcelData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [fileName, setFileName] = useState('');

  const processFile = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        cellStyles: true,
        cellNF: true,
      });

      const sheetData = {};
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const totalRows = range.e.r + 1;
        const totalCols = range.e.c + 1;
        
        // 获取列宽信息
        const colWidths = {};
        if (worksheet['!cols']) {
          worksheet['!cols'].forEach((col, idx) => {
            colWidths[idx] = col.wpx || 100; // 默认宽度100
          });
        }

        // 获取合并单元格信息
        const merges = worksheet['!merges'] || [];

        const data = XLSX.utils.sheet_to_json(worksheet, { 
          header: 'A',
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });

        sheetData[sheetName] = {
          data,
          totalRows,
          totalCols,
          colWidths,
          merges
        };
      });

      setExcelData(sheetData);
      setSelectedSheet(workbook.SheetNames[0]);
      setFileName(file.name);
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  const renderTable = () => {
    if (!excelData || !selectedSheet) return null;

    const sheetInfo = excelData[selectedSheet];
    const { data, totalRows, totalCols, merges } = sheetInfo;

    // 创建表头（A, B, C...）
    const headerRow = Array.from({ length: totalCols }, (_, i) => 
      XLSX.utils.encode_col(i)
    );

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 p-2 sticky left-0 z-10">
                行/列
              </th>
              {headerRow.map(col => (
                <th key={col} className="border border-gray-300 bg-gray-100 p-2 min-w-[100px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(totalRows, 100) }, (_, rowIdx) => (
              <tr key={rowIdx}>
                <td className="border border-gray-300 bg-gray-100 p-2 sticky left-0 z-10 font-medium">
                  {rowIdx + 1}
                </td>
                {headerRow.map(col => {
                  const cellRef = `${col}${rowIdx + 1}`;
                  const cellValue = data[rowIdx]?.[col] || '';
                  
                  // 检查是否是合并单元格的一部分
                  const isMerged = merges.some(range => {
                    const startCell = XLSX.utils.encode_cell(range.s);
                    const endCell = XLSX.utils.encode_cell(range.e);
                    return cellRef >= startCell && cellRef <= endCell;
                  });

                  return (
                    <td 
                      key={`${rowIdx}-${col}`} 
                      className={`border border-gray-300 p-2 ${
                        isMerged ? 'bg-gray-50' : ''
                      }`}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4">
      <Card className="shadow-custom-card">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Excel文件预览</span>
            {fileName && (
              <span className="text-sm font-normal text-gray-600">
                当前文件: {fileName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 文件上传 */}
            <div className="mb-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                         file:rounded-md file:border-0 file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Sheet选择器 */}
            {excelData && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">选择工作表：</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {Object.keys(excelData).map(sheetName => (
                    <option key={sheetName} value={sheetName}>
                      {sheetName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 预览区域 */}
            <div className="border rounded-lg overflow-hidden">
              {renderTable()}
            </div>

            {/* 文件信息 */}
            {excelData && selectedSheet && (
              <div className="mt-4 text-sm text-gray-600">
                <p>工作表：{selectedSheet}</p>
                <p>总行数：{excelData[selectedSheet].totalRows}</p>
                <p>总列数：{excelData[selectedSheet].totalCols}</p>
                {excelData[selectedSheet].merges.length > 0 && (
                  <p>合并单元格数量：{excelData[selectedSheet].merges.length}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExcelPreview;