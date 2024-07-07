import { Sequelize } from "sequelize";

const sequelize = new Sequelize("mydb", "myuser", "mypassword", {
    host: "localhost",
    dialect: "postgres",
});

export default sequelize;
