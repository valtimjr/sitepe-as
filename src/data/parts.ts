export interface Part {
  id: string;
  codigo: string;
  descricao: string;
}

export const staticParts: Part[] = [
  { id: '1', codigo: 'P001', descricao: 'Filtro de Óleo' },
  { id: '2', codigo: 'P002', descricao: 'Vela de Ignição' },
  { id: '3', codigo: 'P003', descricao: 'Pastilha de Freio Dianteira' },
  { id: '4', codigo: 'P004', descricao: 'Amortecedor Traseiro' },
  { id: '5', codigo: 'P005', descricao: 'Bateria 12V 60Ah' },
  { id: '6', codigo: 'P006', descricao: 'Correia Dentada' },
  { id: '7', codigo: 'P007', descricao: 'Bomba de Combustível' },
  { id: '8', codigo: 'P008', descricao: 'Radiador de Água' },
  { id: '9', codigo: 'P009', descricao: 'Pneu Aro 15' },
  { id: '10', codigo: 'P010', descricao: 'Lâmpada H4' },
];