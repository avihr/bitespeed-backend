import express from "express";
import bodyParser from "body-parser";
import sequelize from "./src/models/index.js";
import contactRoutes from "./src/routes/contactRoutes.js";

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.use("/identify", contactRoutes);

sequelize.sync({ force: true }).then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
});
