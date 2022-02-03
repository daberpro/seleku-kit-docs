import { default as express } from "express";
const App = express();
import { fileURLToPath } from 'url';
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

App.use("/", express.static(__dirname + "/dist/"))

App.get("/*", (req, res) => {

    res.sendFile(__dirname + "/dist/index.html");

});

App.listen(() => console.log("server running at port "+PORT));
