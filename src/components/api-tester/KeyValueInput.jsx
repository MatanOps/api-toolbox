import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export default function KeyValueInput({ pairs, onChange, placeholder }) {
  const handleAdd = () => {
    onChange({ ...pairs, '': '' });
  };

  const handleRemove = (keyToRemove) => {
    const newPairs = { ...pairs };
    delete newPairs[keyToRemove];
    onChange(newPairs);
  };

  const handleChange = (oldKey, newKey, value) => {
    const newPairs = { ...pairs };
    if (oldKey !== newKey) {
      delete newPairs[oldKey];
    }
    newPairs[newKey] = value;
    onChange(newPairs);
  };

  return (
    <div className="space-y-2">
      {Object.entries(pairs).map(([key, value], index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={key}
            onChange={(e) => handleChange(key, e.target.value, value)}
            placeholder={`${placeholder} name`}
            className="flex-1"
          />
          <Input
            value={value}
            onChange={(e) => handleChange(key, key, e.target.value)}
            placeholder={`${placeholder} value`}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(key)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add {placeholder}
      </Button>
    </div>
  );
}