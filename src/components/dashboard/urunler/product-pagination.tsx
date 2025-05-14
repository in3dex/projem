'use client';

import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';

interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
  totalElements?: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

// getPageNumbers fonksiyonu UrunlerPage'den buraya taşınabilir veya 
// ayrı bir utility fonksiyonu olarak tutulabilir. Şimdilik burada bırakalım.
const getPageNumbers = (currentPage: number, totalPages: number, pageNeighbours: number = 1) => {
  const totalNumbers = (pageNeighbours * 2) + 3; 
  const totalBlocks = totalNumbers + 2; 

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const startPage = Math.max(1, currentPage - pageNeighbours);
  const endPage = Math.min(totalPages, currentPage + pageNeighbours);
  let pages: (number | string)[] = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);

  const hasLeftSpill = startPage > 1;
  const hasRightSpill = endPage < totalPages;
  const spillOffset = totalNumbers - (pages.length + 1);

  switch (true) {
    case !hasLeftSpill && hasRightSpill:
      {
        const extraPages = Array.from({ length: spillOffset }, (_, i) => endPage + i + 1);
        pages = [...pages, ...extraPages, '...R', totalPages];
        break;
      }
    case hasLeftSpill && !hasRightSpill:
      {
        const extraPages = Array.from({ length: spillOffset }, (_, i) => startPage - i - 1).reverse();
        pages = [1, '...L', ...extraPages, ...pages];
        break;
      }
    case hasLeftSpill && hasRightSpill:
    default:
      {
        pages = [1, '...L', ...pages, '...R', totalPages];
        break;
      }
  }
  if (pages[0] !== 1 && pages[1] !== '...L') {
    pages.unshift(1);
  }
  if (pages[pages.length - 1] !== totalPages && pages[pages.length - 2] !== '...R') {
    pages.push(totalPages);
  }
  return pages;
};

export function ProductPagination({
  currentPage,
  totalPages,
  totalElements,
  onPageChange,
  pageSize,
}: ProductPaginationProps) {
  if (totalPages <= 1) {
    return null; // Sayfalama gerekmiyorsa hiçbir şey gösterme
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const handlePrevious = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (currentPage > 1) {
          onPageChange(currentPage - 1);
      }
  };

  const handleNext = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (currentPage < totalPages) {
          onPageChange(currentPage + 1);
      }
  };

  const handlePageClick = (page: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      onPageChange(page);
  };

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={handlePrevious}
            className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
            aria-disabled={currentPage === 1}
          />
        </PaginationItem>
        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {typeof page === 'string' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={handlePageClick(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={handleNext}
            className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
            aria-disabled={currentPage === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
} 