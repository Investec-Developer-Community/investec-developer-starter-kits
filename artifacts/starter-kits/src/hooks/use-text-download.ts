import { useToast } from '@/hooks/use-toast';
import { downloadText } from '@/lib/local';

export function useTextDownload() {
  const { toast } = useToast();
  return (filename: string, content: string, type?: string) => {
    try {
      downloadText(filename, content, type);
      toast({ title: 'Download started', description: filename });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'File download failed',
        description: `${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      });
    }
  };
}
