export const convertToGrams = (targetUnit: 'g' | 'lb' | 'oz' | 'eighths' | string, values: { g: number, lb: number, oz: number, eighths: number }): number => {
  if (targetUnit === 'g') return values.g || 0;
  
  let totalGrams = 0;
  if (targetUnit === 'lb' || targetUnit === 'lbs_oz') {
    totalGrams += (values.lb || 0) * 453.592;
    totalGrams += (values.oz || 0) * 28.3495;
    totalGrams += (values.eighths || 0) * (28.3495 / 8);
  } else if (targetUnit === 'oz') {
    totalGrams += (values.oz || 0) * 28.3495;
    totalGrams += (values.eighths || 0) * (28.3495 / 8);
  }
  
  return Math.round(totalGrams);
};

export const convertFromGrams = (grams: number, targetUnit: 'g' | 'lb' | 'oz' | 'eighths' | string): { g: number, lb: number, oz: number, eighths: number } => {
  if (!grams || grams <= 0) return { g: 0, lb: 0, oz: 0, eighths: 0 };
  
  if (targetUnit === 'g') {
    return { g: Math.round(grams), lb: 0, oz: 0, eighths: 0 };
  }
  
  if (targetUnit === 'oz') {
    const totalOz = grams / 28.3495;
    let oz = Math.floor(totalOz);
    let eighths = Math.round((totalOz - oz) * 8);
    if (eighths === 8) {
      oz += 1;
      eighths = 0;
    }
    return { g: 0, lb: 0, oz, eighths };
  }
  
  if (targetUnit === 'lb' || targetUnit === 'lbs_oz') {
    const totalOz = grams / 28.3495;
    let lb = Math.floor(totalOz / 16);
    let remainingOz = totalOz - (lb * 16);
    let oz = Math.floor(remainingOz);
    let eighths = Math.round((remainingOz - oz) * 8);
    
    if (eighths === 8) {
      oz += 1;
      eighths = 0;
    }
    if (oz === 16) {
      lb += 1;
      oz = 0;
    }
    return { g: 0, lb, oz, eighths };
  }
  
  return { g: Math.round(grams), lb: 0, oz: 0, eighths: 0 };
};
