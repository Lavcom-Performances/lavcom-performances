interface MachineCount {
  name: string;
  count: number;
}

interface MachineCountListProps {
  machines: MachineCount[];
}

export function MachineCountList({ machines }: MachineCountListProps) {
  return (
    <div className="space-y-1">
      {machines.map((machine, index) => (
        <div 
          key={index}
          className="flex items-center justify-between gap-4 text-sm py-1 px-2 rounded hover:bg-muted/50"
        >
          <span className="font-bold text-primary">{machine.count}</span>
          <span className="text-foreground flex-1">{machine.name}</span>
        </div>
      ))}
    </div>
  );
}
