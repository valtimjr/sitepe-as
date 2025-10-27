import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { X, Save } from 'lucide-react';

interface OtherStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  otherStatusText: string;
  setOtherStatusText: (text: string) => void;
  handleSaveOtherStatus: () => Promise<void>;
  isSaving: boolean;
}

const OtherStatusDialog: React.FC<OtherStatusDialogProps> = ({
  isOpen,
  onOpenChange,
  otherStatusText,
  setOtherStatusText,
  handleSaveOtherStatus,
  isSaving,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Marcar Outro Status</DialogTitle>
          <DialogDescription>
            Use este campo para registrar motivos como Férias, Atestado ou outros afastamentos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="other-status">Descrição (Ex: Férias, Atestado)</Label>
          <Textarea
            id="other-status"
            value={otherStatusText}
            onChange={(e) => setOtherStatusText(e.target.value)}
            placeholder="Descreva o motivo da marcação"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          <Button type="button" onClick={handleSaveOtherStatus} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" /> Salvar Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OtherStatusDialog;