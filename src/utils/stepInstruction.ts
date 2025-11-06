export const getStepInstruction = (step: any): string => {
  const distance = Math.round(step.distance);
  const maneuver = step.maneuver || {};

  switch (maneuver.type) {
    case 'depart':
      return `Start driving for ${distance} meters.`;
    case 'turn':
      return `In ${distance} meters, turn ${maneuver.modifier || 'ahead'}.`;
    case 'roundabout':
      return `In ${distance} meters, take the ${maneuver.exit} exit at the roundabout.`;
    case 'merge':
      return `In ${distance} meters, merge ${maneuver.modifier || ''}.`;
    case 'fork':
      return `In ${distance} meters, keep ${maneuver.modifier || ''} at the fork.`;
    case 'arrive':
      return `You have reached your destination.`;
    default:
      return `Continue straight for ${distance} meters.`;
  }
};
