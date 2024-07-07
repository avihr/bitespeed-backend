import { Op } from "sequelize";
import Contact from "../models/contact.js";

export const identifyContact = async (req, res) => {
    const { email, phoneNumber } = req.body;

    let existingContact = await Contact.findOne({
        where: {
            email,
            phoneNumber,
        },
    });
    if (!existingContact) {
        let contacts = await Contact.findAll({
            where: {
                [Op.or]: [{ email }, { phoneNumber }],
            },
        });

        console.log(
            "------------------" +
                JSON.stringify(contacts, null, 2) +
                "------------------"
        );

        if (contacts.length === 0) {
            const newContact = await Contact.create({
                email,
                phoneNumber,
                linkPrecedence: "primary",
            });

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
        console.log("primaryContact", primaryContact);
        if (!primaryContact) {
            primaryContact = contacts[0];
            if (!primaryContact.linkedId) {
                primaryContact.linkPrecedence = "primary";
                await primaryContact.save();
            }
        }

        const secondaryContactIds = contacts
            .filter((contact) => contact.linkPrecedence !== "primary")
            .map((contact) => contact.id);

        if (
            contacts.some(
                (contact) =>
                    contact.email !== email ||
                    contact.phoneNumber !== phoneNumber
            )
        ) {
            console.log(
                "----------------creating new secondary contact--------"
            );
            const newContact = await Contact.create({
                email,
                phoneNumber,
                linkedId: primaryContact.linkedId || primaryContact.id,
                linkPrecedence: "secondary",
            });
            secondaryContactIds.push(newContact.id);
        }

        let secondaryContacts = await Contact.findAll({
            where: {
                linkedId: primaryContact.id,
            },
        });

        console.log(
            "------------------secondary contacts",
            JSON.stringify(secondaryContacts)
        );

        let emailArray = [
            primaryContact.email,
            ...contacts
                .filter((contact) => primaryContact.email !== contact.email)
                .map((contact) => Number(contact.email)),
        ];

        if (email && !emailArray.includes(email)) emailArray.push(email);

        let phoneArray = [
            Number(primaryContact.phoneNumber),
            ...contacts
                .filter(
                    (contact) =>
                        primaryContact.phoneNumber !== contact.phoneNumber
                )
                .map((contact) => Number(contact.phoneNumber)),
        ];

        if (phoneNumber && !phoneArray.includes(phoneNumber))
            phoneArray.push(phoneNumber);

        return res.status(200).json({
            contact: {
                primaryContatctId: primaryContact.linkedId || primaryContact.id,
                emails: emailArray,
                phoneNumbers: phoneArray,
                secondaryContactIds,
            },
        });
    } else return res.status(200).json({ contact: existingContact });
};
