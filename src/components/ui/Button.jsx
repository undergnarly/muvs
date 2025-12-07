import React from 'react';
import clsx from 'clsx';
import './Button.css';

const Button = ({
    children,
    variant = 'light', // 'light' | 'dark' | 'outline'
    onClick,
    href,
    className,
    type = 'button',
    ...props
}) => {
    const Component = href ? 'a' : 'button';

    return (
        <Component
            href={href}
            type={!href ? type : undefined}
            className={clsx('btn', `btn-${variant}`, className)}
            onClick={onClick}
            target={href ? "_blank" : undefined}
            rel={href ? "noopener noreferrer" : undefined}
            {...props}
        >
            {children}
        </Component>
    );
};

export default Button;
