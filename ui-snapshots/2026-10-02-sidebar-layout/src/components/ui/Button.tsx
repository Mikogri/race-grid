import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'icon';

const cx = (variant: Variant, className?: string) => [styles.button, styles[variant], className].filter(Boolean).join(' ');

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', icon, children, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx(variant, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'secondary', icon, children, className, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cx(variant, typeof className === 'string' ? className : undefined)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
