// src/components/AboutPage.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const AboutPage = () => {
  return (
    <div className="mt-8">
      <Card className="shadow-custom-card">
        <CardHeader>
          <CardTitle>关于项目</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-lg">
              这是一个开源的网页项目，用于TikTok后台数据处理的，懒人的数据分析工具。
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium">GitHub仓库链接：</span>
              <a 
                href="https://github.com/SUXUING-star/tiktok-analytics" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 hover:underline"
              >
                https://github.com/SUXUING-star/tiktok-analytics
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutPage;