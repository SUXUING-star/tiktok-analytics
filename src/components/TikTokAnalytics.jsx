import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import * as XLSX from 'xlsx';
import DataPreprocessor from './DataPreprocessor'; // 导入数据预处理组件

const TikTokAnalytics = () => {
  const [totalData, setTotalData] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [productTotalData, setProductTotalData] = useState(null);
  const [activeTab, setActiveTab] = useState('charts');
  const [autoPreprocess, setAutoPreprocess] = useState(true); // 添加自动预处理状态 // 'charts', 'stats', 或 'preprocess'

  // 颜色常量
  const COLORS = {
    blue: '#4096ff',
    green: '#52c41a',
    orange: '#fa8c16',
    purple: '#722ed1',
    red: '#f5222d',
  };

  // 格式化日期，只保留月/日
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 添加数据预处理函数
  const preprocessData = (data, fileName) => {
    // 确定起始行
    let headerRow = 0;
    const fileNameLower = fileName.toLowerCase();
    if (fileNameLower.includes('overview') || fileNameLower.includes('business performance')) {
      headerRow = 4;
    } else if (fileNameLower.includes('product card traffic') || fileNameLower.includes('products card list')) {
      headerRow = 2;
    }

    // 处理数据
    return data.map(row => {
      const newRow = {};
      Object.entries(row).forEach(([key, value]) => {
        // 处理 NaN、null、undefined、空字符串
        if (value === null || value === undefined || value === '' || 
            (typeof value === 'number' && isNaN(value)) ||
            value === 'NaN' || value === 'nan' || value === '#N/A') {
          newRow[key] = 0;
          return;
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
  };

  const getFileConfig = (fileName) => {
    // 转换为小写并移除可能的时间戳和扩展名
    const cleanName = fileName.toLowerCase().replace(/[_-]\d+.*\.xlsx?$/, '');
    
    if (cleanName.includes('overview') || cleanName.includes('business performance')) {
      return { type: 'total', headerRow: 4, newName: 'total.xlsx' }; // 从第5行开始
    }
    if (cleanName.includes('product card traffic')) {
      return { type: 'producttotal', headerRow: 2, newName: 'producttotal.xlsx' }; // 从第3行开始
    }
    if (cleanName.includes('products card list')) {
      return { type: 'products', headerRow: 2, newName: 'products.xlsx' }; // 从第3行开始
    }
    return { type: 'unknown', headerRow: 0, newName: 'unknown.xlsx' };
  };

  const processFile = async (file, fileType) => {
    try {
      const { headerRow } = getFileConfig(file.name);
      
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        cellNF: true,
        cellStyles: true
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      let data = XLSX.utils.sheet_to_json(firstSheet, {
        range: headerRow // 设置起始行
      });

      // 处理数据中的NaN和特殊值
      data = data.map(row => {
        const newRow = {};
        Object.entries(row).forEach(([key, value]) => {
          // 处理各种特殊值
          if (value === null || value === undefined || value === '' || 
              (typeof value === 'number' && isNaN(value)) ||
              value === 'NaN' || value === 'nan' || value === '#N/A') {
            newRow[key] = 0;
            return;
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

      // 如果启用了自动预处理，对数据进行处理
      if (autoPreprocess) {
        data = preprocessData(data, file.name);
      }

      // 更新状态前再次确保所有数值都是有效的数字
      const validateData = (data) => {
        return data.map(item => {
          const validItem = {};
          Object.entries(item).forEach(([key, value]) => {
            // 如果是数值类型的字段，确保是有效的数字
            if (typeof value === 'number') {
              validItem[key] = isNaN(value) ? 0 : value;
            } else {
              validItem[key] = value;
            }
          });
          return validItem;
        });
      };

      switch(fileType) {
        case 'total':
          setTotalData(validateData(data));
          break;
        case 'products':
          setProductsData(validateData(data));
          break;
        case 'productTotal':
          setProductTotalData(validateData(data));
          break;
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  // 处理预处理后的数据
  const handleProcessedData = (processedData, fileType) => {
    switch(fileType) {
      case 'total':
        setTotalData(processedData);
        break;
      case 'products':
        setProductsData(processedData);
        break;
      case 'productTotal':
        setProductTotalData(processedData);
        break;
    }
  };

  // 统计数据计算逻辑
  const calculateStatistics = () => {
    if (!totalData || !productsData || !productTotalData) return null;
  
    // 使用模糊搜索找到商品交易总额字段
    const findAmountField = (item) => {
      const key = Object.keys(item).find(k => k.toLowerCase().includes('商品交易总额'));
      return key ? (parseFloat(item[key]) || 0) : 0;
    };
  
    return {
      总览数据: {
        总计页面浏览量: totalData.reduce((sum, item) => sum + item['页面浏览次数'], 0),
        总计访客数: totalData.reduce((sum, item) => sum + item['商品访客数'], 0),
        总计订单数: totalData.reduce((sum, item) => sum + item['订单数'], 0),
        总成交额: totalData.reduce((sum, item) => sum + findAmountField(item), 0).toFixed(2) + ' ₱',
      },
      商品总体数据: {
        总曝光用户数: productsData.reduce((sum, item) => sum + item['曝光用户数'], 0),
        总点击人数: productsData.reduce((sum, item) => sum + item['点击人数'], 0),
        总加车人数: productsData.reduce((sum, item) => sum + item['加车人数'], 0),
        总支付人数: productsData.reduce((sum, item) => sum + item['支付人数'], 0),
      },
      抽样商品数据: {
        总商品数: productTotalData.length,
        有订单商品数: productTotalData.filter(item => item['支付人数'] > 0).length
      }
    };
  };

  // 渲染统计数据
  const renderStatistics = () => {
    const stats = calculateStatistics();
    if (!stats) return null;
  
    // 为总览数据准备漏斗图数据
    const overviewFunnelData = [
      {
        name: '总览漏斗',
        '页面浏览': stats.总览数据.总计页面浏览量,
        '访客': stats.总览数据.总计访客数,
        '订单': stats.总览数据.总计订单数,
        '成交额': parseFloat(stats.总览数据.总成交额.replace(' ₱', ''))
      }
    ];
  
    // 为商品数据准备漏斗图数据
    const productFunnelData = [
      {
        name: '商品漏斗',
        '曝光': stats.商品总体数据.总曝光用户数,
        '点击': stats.商品总体数据.总点击人数,
        '加购': stats.商品总体数据.总加车人数,
        '支付': stats.商品总体数据.总支付人数
      }
    ];
  
    return (
      <div className="space-y-6">
        {/* 原有的统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(stats).map(([category, data]) => (
            <Card key={category} className="shadow-custom-card">
              <CardHeader>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <dt className="text-sm text-gray-600">{key}:</dt>
                      <dd className="text-sm font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
  
        {/* 总览数据漏斗图 */}
        <Card className="shadow-custom-card">
          <CardHeader>
            <CardTitle>总览数据漏斗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={overviewFunnelData}
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="页面浏览" fill="#4096ff" />
                  <Bar dataKey="访客" fill="#52c41a" />
                  <Bar dataKey="成交额" fill="#722ed1" />
                  <Bar dataKey="订单" fill="#fa8c16" />
                  
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
  
        {/* 商品数据漏斗图 */}
        <Card className="shadow-custom-card">
          <CardHeader>
            <CardTitle>商品数据漏斗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={productFunnelData}
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="曝光" fill="#4096ff" />
                  <Bar dataKey="点击" fill="#52c41a" />
                  <Bar dataKey="加购" fill="#fa8c16" />
                  <Bar dataKey="支付" fill="#722ed1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  const renderTotalMetricsChart = () => {
    if (!totalData || !totalData.length) return null;

    const chartData = totalData.map(item => ({
      date: formatDate(item['日期']),
      '页面浏览次数': item['页面浏览次数'],
      '商品访客数': item['商品访客数'],
      '订单数': item['订单数']
    })).reverse();

    return (
      <Card className="w-full mb-6 shadow-custom-card">
        <CardHeader>
          <CardTitle>总体数据文件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="页面浏览次数" fill={COLORS.blue} name="页面浏览次数" />
                <Bar dataKey="商品访客数" fill={COLORS.green} name="商品访客数" />
                <Bar dataKey="订单数" fill={COLORS.orange} name="订单数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };
  
   const renderProductsConversionChart = () => {
        if (!productsData || !productsData.length) return null;
    
        const conversionData = productsData.map(item => ({
          date: formatDate(item['时间']),
          '曝光人数': item['曝光用户数'],
          '点击人数': item['点击人数'],
          '加车人数': item['加车人数'],
          '支付人数': item['支付人数']
        })).reverse();
    
        const rateData = productsData.map(item => ({
          date: formatDate(item['时间']),
            '曝光到点击': (item['曝光到点击转化率'] !== undefined) ? (parseFloat(item['曝光到点击转化率']) * 100) : 0,
            '点击到加车': (item['点击到加车转化率'] !== undefined) ? (parseFloat(item['点击到加车转化率']) * 100) : 0,
            '点击到成交': (item['点击到成交转化率'] !== undefined) ? (parseFloat(item['点击到成交转化率']) * 100) : 0,
            '加车到成交': (item['加车到成交转化率'] !== undefined) ? (parseFloat(item['加车到成交转化率']) * 100) : 0
        })).reverse();

        return (
            <>
                <Card className="w-full mb-6 shadow-custom-card">
                    <CardHeader>
                        <CardTitle>商品数据转化数据</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={conversionData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="曝光人数" fill={COLORS.blue} name="曝光人数" />
                                    <Bar dataKey="点击人数" fill={COLORS.green} name="点击人数" />
                                    <Bar dataKey="加车人数" fill={COLORS.purple} name="加车人数" />
                                    <Bar dataKey="支付人数" fill={COLORS.orange} name="支付人数" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="w-full mb-6 shadow-custom-card">
                    <CardHeader>
                        <CardTitle>商品转化率数据</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rateData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={(value) => `${value}%`} />
                                    <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                                    <Legend />
                                    <Bar dataKey="曝光到点击" fill={COLORS.blue} name="曝光到点击转化率" />
                                    <Bar dataKey="点击到加车" fill={COLORS.green} name="点击到加车转化率" />
                                    <Bar dataKey="点击到成交" fill={COLORS.purple} name="点击到成交转化率" />
                                    <Bar dataKey="加车到成交" fill={COLORS.orange} name="加车到成交转化率" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </>
        );
    };


    const renderProductTotalChart = () => {
      if (!productTotalData || !productTotalData.length) return null;
    
      const totalSKUs = productTotalData.length;
      const skusWithOrders = productTotalData.filter(item => item['支付人数'] > 0).length;
    
      const pieData = [
        { name: '有订单商品', value: skusWithOrders },
        { name: '无订单商品', value: totalSKUs - skusWithOrders }
      ];
    
        const rateData = productTotalData.map(item => ({
            name: item['name'],
           '曝光到点击转化率': (item['曝光到点击转化率'] !== undefined) ? (parseFloat(item['曝光到点击转化率']) * 100) : 0,
           '点击到加车转化率': (item['点击到加车转化率'] !== undefined) ? (parseFloat(item['点击到加车转化率']) * 100) : 0,
           '点击到成交转化率': (item['点击到成交转化率'] !== undefined) ? (parseFloat(item['点击到成交转化率']) * 100) : 0,
          '加车到成交转化率': (item['加车到成交转化率'] !== undefined) ? (parseFloat(item['加车到成交转化率']) * 100) : 0
        }));
      return (
        <>
          <Card className="w-full mb-6 shadow-custom-card">
            <CardHeader>
              <CardTitle>抽样商品转化数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productTotalData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="曝光人数" fill={COLORS.blue} name="曝光人数" />
                    <Bar dataKey="点击人数" fill={COLORS.green} name="点击人数" />
                    <Bar dataKey="加车人数" fill={COLORS.purple} name="加车人数" />
                    <Bar dataKey="支付人数" fill={COLORS.orange} name="支付人数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
    
          {/* 修改这部分，直接使用文件中的转化率列 */}
          <Card className="w-full mb-6 shadow-custom-card">
            <CardHeader>
              <CardTitle>转化率数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rateData} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${value}%`} />
                       <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                        <Legend />
                        <Bar dataKey="曝光到点击转化率" fill={COLORS.blue} name="曝光到点击转化率" />
                        <Bar dataKey="点击到加车转化率" fill={COLORS.green} name="点击到加车转化率" />
                        <Bar dataKey="点击到成交转化率" fill={COLORS.purple} name="点击到成交转化率" />
                        <Bar dataKey="加车到成交转化率" fill={COLORS.orange} name="加车到成交转化率" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
    
          <Card className="w-full mb-6 shadow-custom-card">
            <CardHeader>
              <CardTitle>商品订单占比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[COLORS.blue, COLORS.orange][index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">总商品数: {totalSKUs}</p>
                <p className="text-sm text-gray-600">有订单商品数: {skusWithOrders}</p>
                <p className="text-sm text-gray-600">无订单商品数: {totalSKUs - skusWithOrders}</p>
              </div>
            </CardContent>
          </Card>
        </>
      );
    };

  return (
    <div className="container mx-auto px-4 flex flex-col min-h-screen">
      <header className="bg-white py-4 shadow-md">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <h1 className="text-3xl font-bold">TikTok数据分析工具</h1>
        </div>
        <div className="container mx-auto px-4 flex justify-center">
          <img src="/header.gif" alt="header" className="block max-h-32 mx-auto mt-2 loading-lazy"/>
        </div>
      </header>

      <div className="flex flex-col flex-1">
        {/* 导航栏 */}
        <div className="sticky top-0 bg-white z-10 pb-4 border-b">
          <div className="flex space-x-4 mb-4 justify-center">
            <button
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'charts'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('charts')}
            >
              数据图表
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'stats'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('stats')}
            >
              统计数据
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'preprocess'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab('preprocess')}
            >
              数据预处理
            </button>
          </div>
        </div>

        {/* 文件上传区域 */}
        <div className="grid gap-6 mb-8 mt-4">
          {activeTab !== 'preprocess' && (
            <Card className="shadow-custom-card">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>上传文件</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoPreprocess"
                      checked={autoPreprocess}
                      onChange={(e) => setAutoPreprocess(e.target.checked)}
                      className="rounded border-gray-300 text-blue-500 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <label htmlFor="autoPreprocess" className="text-sm font-normal">
                      自动预处理数据
                    </label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">总体数据文件:</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => processFile(e.target.files[0], 'total')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                           file:rounded-md file:border-0 file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">商品数据文件:</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => processFile(e.target.files[0], 'products')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                           file:rounded-md file:border-0 file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">抽样商品数据文件:</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => processFile(e.target.files[0], 'productTotal')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                           file:rounded-md file:border-0 file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 根据当前标签显示相应内容 */}
        {activeTab === 'charts' && (
          <>
            {renderTotalMetricsChart()}
            {renderProductsConversionChart()}
            {renderProductTotalChart()}
          </>
        )}

        {activeTab === 'stats' && renderStatistics()}

        {activeTab === 'preprocess' && (
          <DataPreprocessor 
            onProcessedData={handleProcessedData}
          />
        )}
      </div>

      <footer className="bg-gray-100 py-4 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TikTok数据分析工具. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TikTokAnalytics;