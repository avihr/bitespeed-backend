import { Op } from "sequelize";
import Contact from "../models/contact.js";

export const identifyContact = async (req, res) => {
    const { email, phoneNumber } = req.body;

    let contacts = await Contact.findAll({
        where: {
            [Op.or]: [{ email }, { phoneNumber }],
        },
    });

    if (contacts.length === 0) {
        let newContact = req.body;
        newContact.linkPrecedence = "primary";

        try {
            newContact = await Contact.create(newContact);
        } catch (err) {
            console.log(err);
            return res.status(500).send(err.message);
        }

        return res.status(200).json({
            contact: {
                primaryContatctId: newContact.id,
                emails: [newContact.email],
                phoneNumbers: [newContact.phoneNumber],
                secondaryContactIds: [],
            },
        });
    }
    let primaryContact = contacts.find(
        (contact) => contact.linkPrecedence === "primary"
    );
    if (!primaryContact) {
        let primaryContactId = contacts[0].linkedId;
        primaryContact = Contact.findOne(primaryContactId);
        contacts = Contact.findAll({
            where: {
                linkedId: primaryContactId,
            },
        });
    }

    const emails = new Set();
    const phoneNumbers = new Set();
    const secondaryContactIds = [];

    contacts.forEach((contact) => {
        if (
            contact.linkPrecedence === "primary" &&
            contact.id !== primaryContact.id
        ) {
            contact.linkPrecedence = "secondary";
            contact.linkedId = primaryContact.id;
            contact.save();
        }
        if (contact.email) emails.add(contact.email);
        if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
        if (contact.id !== primaryContact.id)
            secondaryContactIds.push(contact.id);
    });

    // If the current data does not match any contact, create a new secondary contact

    if (!emails.has(email) || !phoneNumbers.has(String(phoneNumber))) {
        console.log("creating New contact");
        let newContact;
        try {
            newContact = await Contact.create({
                phoneNumber,
                email,
                linkPrecedence: "secondary",
                linkedId: primaryContact.id,
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({
                message: "Internal server error",
            });
        }
        secondaryContactIds.push(newContact.id);
        if (newContact.email) emails.add(newContact.email);
        if (newContact.phoneNumber) phoneNumbers.add(newContact.phoneNumber);
    }

    return res.status(200).json({
        contact: {
            primaryContatctId: primaryContact.id,
            emails: [...emails],
            phoneNumbers: [...phoneNumbers],
            secondaryContactIds,
        },
    });
};
