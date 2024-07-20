import { FC, ReactNode } from "react";

export const FormFieldContainer: FC<{
  id?: string;
  label: ReactNode;
  children: ReactNode;
  topRight?: ReactNode;
}> = ({ id, label, children, topRight }) => {
  return (
    <div>
      <div className="mb-1 flex w-full justify-between">
        <label htmlFor={id}>{label}</label>
        {topRight && <div>{topRight}</div>}
      </div>
      {children}
    </div>
  );
};
