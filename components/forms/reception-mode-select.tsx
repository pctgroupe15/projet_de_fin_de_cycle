import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ReceptionModeSelectProps {
  value: string;
  onChange: (value: string) => void;
  address?: string;
  onAddressChange?: (address: string) => void;
}

export function ReceptionModeSelect({
  value,
  onChange,
  address,
  onAddressChange,
}: ReceptionModeSelectProps) {
  const [showAddressInput, setShowAddressInput] = useState(value === 'delivery');

  const handleModeChange = (newValue: string) => {
    onChange(newValue);
    setShowAddressInput(newValue === 'delivery');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Mode de réception</Label>
        <RadioGroup
          value={value}
          onValueChange={handleModeChange}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pickup" id="pickup" />
            <Label htmlFor="pickup">Retrait en mairie</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="delivery" id="delivery" />
            <Label htmlFor="delivery">Livraison à domicile</Label>
          </div>
        </RadioGroup>
      </div>

      {showAddressInput && (
        <div>
          <Label htmlFor="address">Adresse de livraison</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => onAddressChange?.(e.target.value)}
            placeholder="Entrez votre adresse complète"
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
} 