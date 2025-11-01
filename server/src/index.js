"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var PORT = 3000;
var app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", function (req, res) {
    res.json([
        { id: 1, name: "Somsri" },
        { id: 2, name: "Somsai" }
    ]);
});
app.listen(PORT, function () { return console.log("Server running at port ".concat(PORT)); });
