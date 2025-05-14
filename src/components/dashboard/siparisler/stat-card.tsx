import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// -------- İstatistik Kartı Bileşeni --------
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  tooltipDescription: string;
  description?: string;
  isLoading: boolean;
  action?: React.ReactNode;
}

export function StatCard({ title, value, icon: Icon, tooltipDescription, description, isLoading, action }: StatCardProps) {
  return (
    <Card className="flex flex-col"> 
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Icon className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipDescription}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="flex-grow"> 
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && !isLoading && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
      {action && (
        <div className="p-4 pt-0 mt-auto"> 
          {action}
        </div>
      )}
    </Card>
  );
}
// -------- İstatistik Kartı Bileşeni Sonu -------- 