import React from 'react';

interface PageTitleProps {
  title: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
}

/**
 * Standardisierte Page-Titel-Komponente mit Slot für Extra-Content
 * 
 * Verwendung:
 * <PageTitle title="Seitentitel" extra={<DebugPageId id={PAGE_IDS.SEITE} />} />
 */
export function PageTitle({ title, extra, className = '' }: PageTitleProps) {
  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <h1 style={{
        margin: 0,
        fontSize: '28px',
        fontWeight: '600',
        color: '#111827'
      }}>
        {title}
      </h1>
      {extra}
    </div>
  );
}

export default PageTitle;
