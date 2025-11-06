import { useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  email: string;
  onSuccess: () => void;
}

export function VerificationModal({ 
  isOpen, 
  onClose, 
  userId, 
  email,
  onSuccess 
}: VerificationModalProps) {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      toast({
        title: "Greška",
        description: "Verifikacioni kod mora imati 6 cifara",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/verify-email", { 
        userId, 
        code: verificationCode 
      });
      const data = await res.json();
      
      queryClient.setQueryData(["/api/user"], data.user);
      
      toast({
        title: "Uspešno!",
        description: "Vaš email je verifikovan. Dobrodošli u Studio LeFlow!",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nevažeći verifikacioni kod",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await apiRequest("POST", "/api/resend-verification", { email });
      toast({
        title: "Uspešno!",
        description: "Novi verifikacioni kod je poslat na Vaš email",
      });
      setVerificationCode("");
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju koda",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Verifikujte Email
          </DialogTitle>
          <DialogDescription className="text-center">
            Poslali smo 6-cifreni kod na:<br />
            <span className="font-semibold text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Verifikacioni Kod</label>
            <Input
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-widest font-bold"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Proverite inbox i spam folder
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isVerifying || verificationCode.length !== 6}
          >
            {isVerifying ? "Verifikujem..." : "Potvrdi Email"}
          </Button>
        </form>

        <div className="pt-4 border-t space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            Niste dobili kod?
          </p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? "animate-spin" : ""}`} />
            {isResending ? "Šaljem..." : "Pošalji Novi Kod"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
