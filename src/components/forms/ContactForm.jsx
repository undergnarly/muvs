import React from 'react';
import { useData } from '../../context/DataContext';
import { configuredContactLinks } from '../../utils/configuredContactLinks';
import Button from '../ui/Button';
import './ContactForm.css';

const ContactForm = () => {
    const { siteSettings } = useData();
    const links = configuredContactLinks(siteSettings);

    return <section className="legacy-contact">
        <h3>Get in touch</h3>
        <p>{links.length ? 'Choose a channel to get in touch.' : 'Contact details are not available right now.'}</p>
        {links.length > 0 && <nav className="legacy-contact-links" aria-label="Contact channels">
            {links.map((link, index) => <Button key={link.key} href={link.href} variant={index === 0 ? 'accent' : 'outline'}>{link.label}</Button>)}
        </nav>}
    </section>;
};

export default ContactForm;
