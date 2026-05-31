'use client';

import React, { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // إنشاء عميل استعلام منفصل لكل طلب لتفادي تشارك البيانات بين المستخدمين على الخادم
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // كاش صالح لمدة دقيقة
            refetchOnWindowFocus: false, // تفادي إعادة الجلب التلقائي عند تحويل التركيز
            retry: 1, // تكرار الاستعلام مرة واحدة في حال الفشل
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
