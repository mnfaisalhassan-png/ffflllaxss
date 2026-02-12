import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, icon, className = '', id, ...props }) => {
  const inputId = id || props.name || Math.random().toString(36).substr(2, 9);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            appearance-none block w-full rounded-md shadow-sm placeholder-gray-400 
            focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm
            ${icon ? 'pl-10 pr-3' : 'px-3'} py-2
            ${error 
              ? 'border-2 border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
              : 'border-2 border-black text-black bg-white'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
};