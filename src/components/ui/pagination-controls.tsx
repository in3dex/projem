import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  totalElements?: number;
  pageSize?: number;
}

// Sayfa numaralarını oluşturmak için yardımcı fonksiyon (shadcn örneğinden uyarlanmış)
const getPageNumbers = (currentPage: number, totalPages: number, siblings = 1) => {
    const totalNumbers = siblings * 2 + 3; // Gösterilecek toplam numara sayısı (önceki, sonraki, noktalar dahil)
    const totalBlocks = totalNumbers + 2; // Toplam blok sayısı

    if (totalPages <= totalBlocks) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const startPage = Math.max(2, currentPage - siblings);
    const endPage = Math.min(totalPages - 1, currentPage + siblings);
    let pages: (number | string)[] = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);

    const hasLeftSpill = startPage > 2;
    const hasRightSpill = (totalPages - endPage) > 1;
    const spillOffset = totalNumbers - (pages.length + 1);

    switch (true) {
        // Sadece sağda ellipsis
        case !hasLeftSpill && hasRightSpill:
            const extraPagesRight = Array.from({ length: spillOffset }, (_, i) => endPage + i + 1);
            pages = [1, ...pages, ...extraPagesRight, 'ellipsis', totalPages];
            break;

        // Sadece solda ellipsis
        case hasLeftSpill && !hasRightSpill:
            const extraPagesLeft = Array.from({ length: spillOffset }, (_, i) => startPage - i - 1).reverse();
            pages = [1, 'ellipsis', ...extraPagesLeft, ...pages, totalPages];
            break;

        // Her iki tarafta ellipsis
        case hasLeftSpill && hasRightSpill:
        default:
            pages = [1, 'ellipsis', ...pages, 'ellipsis', totalPages];
            break;
    }

    return pages;
};

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className,
  totalElements,
  pageSize
}: PaginationControlsProps) {

  if (totalPages <= 1) {
    return null; // Sayfalama gerekmiyorsa gösterme
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const startIndex = pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endIndex = pageSize && totalElements ? Math.min(startIndex! + pageSize - 1, totalElements) : null;

  return (
    <div className={cn("mt-6 flex flex-col sm:flex-row items-center justify-between gap-4", className)}>
        {totalElements !== undefined && startIndex !== null && endIndex !== null && (
            <div className="text-sm text-muted-foreground">
                Toplam {totalElements} kayıttan {startIndex} - {endIndex} arası gösteriliyor.
            </div>
        )}
        <Pagination className="mx-0 w-auto sm:w-fit">
            <PaginationContent>
            <PaginationItem>
                <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); onPageChange(currentPage - 1); }}
                aria-disabled={currentPage <= 1}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                />
            </PaginationItem>
            {pageNumbers.map((page, index) => (
                <PaginationItem key={index}>
                {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                ) : (
                    <PaginationLink
                    href="#"
                    onClick={(e) => { e.preventDefault(); onPageChange(page as number); }}
                    isActive={currentPage === page}
                    >
                    {page}
                    </PaginationLink>
                )}
                </PaginationItem>
            ))}
            <PaginationItem>
                <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); onPageChange(currentPage + 1); }}
                aria-disabled={currentPage >= totalPages}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                />
            </PaginationItem>
            </PaginationContent>
        </Pagination>
    </div>
  );
} 