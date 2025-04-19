import { saveHabits } from './localStorage';

export const seedHabitData = async () => {
  const sampleHabits = [
    { name: 'Drink Water', completed: true },
    { name: 'Exercise', completed: false },
    { name: 'Read a Book', completed: true },
    { name: 'Meditation', completed: true },
    { name: 'Sleep 8 Hours', completed: false },
  ];

  await saveHabits(sampleHabits);
};