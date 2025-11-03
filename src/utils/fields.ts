// fieldConfigs.ts
import type { HealthFormData } from './validators';

export type FieldConfig = {
    name: keyof HealthFormData;
    label: string;
    placeholder?: string;
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'multi-select';
    options?: string[];
    items?: { label: string; value: string }[];
};

export const stepFields: { step: number; title: string; fields: FieldConfig[] }[] = [
    {
        step: 1,
        title: 'Basic Information',
        fields: [
            {
                name: 'gender',
                label: 'Gender',
                placeholder: 'Male / Female',
                type: 'select',
                items: [
                    { label: 'Male', value: 'Male' },
                    { label: 'Female', value: 'Female' },
                ],
            },
            {
                name: 'birthDate',
                label: 'Birth Date',
                placeholder: 'MM-DD-YYYY',
                type: 'date',
            },
            { name: 'height', label: 'Height', placeholder: 'e.g. 170', type: 'number' },
            {
                name: 'heightUnit',
                label: 'Height Unit',
                placeholder: 'CM / INCH',

                type: 'select',
                items: [
                    { label: 'Centimeters', value: 'CM' },
                    { label: 'Inches', value: 'INCH' },
                ],
            },
        ],
    },
    {
        step: 2,
        title: 'Weight & Goals',
        fields: [
            { name: 'weight', label: 'Current Weight', placeholder: 'e.g. 65', type: 'number' },
            {
                name: 'weightUnit',
                label: 'Weight Unit',
                type: 'select',
                placeholder: 'KG / LB',
                items: [
                    { label: 'Kilograms', value: 'KG' },
                    { label: 'Pounds', value: 'LB' },
                ],
            },
            {
                name: 'activityLevel',
                label: 'Activity Level',
                placeholder: 'Your Activity Level',
                type: 'select',
                items: [
                    { label: 'Low', value: 'low' },
                    { label: 'Moderate', value: 'moderate' },
                    { label: 'High', value: 'high' },
                ],
            },
            { name: 'goalWeight', label: 'Goal Weight', placeholder: 'e.g. 60', type: 'number' },
            { name: 'goalCalories', label: 'Goal Calories', placeholder: 'e.g. 2000', type: 'number' },
        ],
    },
    {
        step: 3,
        title: 'Medical Considerations',
        fields: [
            { name: 'hasDiabetes', label: 'Diabetes', placeholder: 'Have Diabetes?', type: 'checkbox' },
            { name: 'hasHypertension', label: 'Hypertension', placeholder: 'Have Hypertension?', type: 'checkbox' },
            {
                name: 'dietaryRestrictions',
                label: 'Dietary Restrictions',
                placeholder: 'Any Restrictions?',
                type: 'multi-select',
                items: [
                    { label: 'Vegan', value: 'Vegan' },
                    { label: 'Vegetarian', value: 'Vegetarian' },
                    { label: 'Keto', value: 'Keto' },
                    { label: 'Gluten-Free', value: 'Gluten-Free' },
                ],
            },
        ],
    },
];
