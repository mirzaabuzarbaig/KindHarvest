import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={`sticky top-2 z-40 ${className}`}>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
    </div>
  );
}
