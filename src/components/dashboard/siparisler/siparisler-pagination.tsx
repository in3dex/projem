"use client";

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  } from "@/components/ui/pagination";

// PaginationLink için size değerini ekleyelim (page.tsx'den alındı)
const PaginationCustomLink = ({ isActive, children, onClick }: { 
    isActive: boolean, 
    children: React.ReactNode, 
    onClick: () => void 
  }) => (
    <PaginationLink 
      isActive={isActive} 
      onClick={onClick}
      size="default"
    >
      {children}
    </PaginationLink>
  );

interface SiparislerPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    getPageNumbers: (currentPage: number, totalPages: number, pageNeighbours?: number) => (number | string)[]; // page.tsx'deki fonksiyon tipi
}

export function SiparislerPagination({
    currentPage,
    totalPages,
    onPageChange,
    getPageNumbers,
}: SiparislerPaginationProps) {
    if (totalPages <= 1) {
        return null; // Sayfalama gerekmiyorsa hiçbir şey gösterme
    }

    return (
        <div className="flex justify-center p-4 border-t">
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious 
                            onClick={() => onPageChange(currentPage - 1)} 
                            disabled={currentPage === 0}
                            size="default"
                        />
                    </PaginationItem>
                    {getPageNumbers(currentPage, totalPages).map((pageNumber, index) => (
                        <PaginationItem key={index}>
                            {pageNumber === '...' ? (
                                <PaginationEllipsis />
                            ) : (
                                <PaginationCustomLink
                                    isActive={currentPage === (pageNumber as number) - 1}
                                    onClick={() => onPageChange((pageNumber as number) - 1)}
                                >
                                    {pageNumber}
                                </PaginationCustomLink>
                            )}
                        </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext 
                            onClick={() => onPageChange(currentPage + 1)} 
                            disabled={currentPage === totalPages - 1}
                            size="default"
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
} 