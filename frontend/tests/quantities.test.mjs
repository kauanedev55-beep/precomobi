import assert from "node:assert/strict";
import {test} from "node:test";
import {itemSubtotal,parseQuantity,quantityLabel,saleLabel} from "../.test-build/quantities.js";
test("weights accept decimal comma and up to three places without forcing whole kilos",()=>{
  assert.equal(parseQuantity("0,750","kg"),0.75);assert.equal(parseQuantity("0.001","kg"),0.001);
  for(const value of ["","0","-1","0,0001","1e3","Infinity","1,2,3"]) assert.equal(parseQuantity(value,"kg"),null);
  assert.equal(parseQuantity("2","unit"),2);assert.equal(parseQuantity("0,750","unit"),null);
});
test("basket estimates match cents rounding for kilo and package quantities",()=>{
  assert.equal(itemSubtotal("8.00",0.75),"6.00");assert.equal(itemSubtotal("9.99",0.75),"7.49");
  assert.equal(itemSubtotal("9.99",0.005),"0.05");assert.equal(itemSubtotal("3.50",2),"7.00");
  assert.equal(itemSubtotal(null,0.75),null);assert.equal(itemSubtotal("8.00",NaN),null);
});
test("quantity and price labels distinguish kg from packaged units",()=>{
  assert.equal(quantityLabel("0.750","kg"),"0,75 kg");assert.equal(quantityLabel("2","unit"),"2 un.");
  assert.equal(saleLabel("kg"),"kg");assert.equal(saleLabel("unit"),"unidade / embalagem");
});

import {validationMessage} from "../.test-build/validation.js";
test("registration explains incomplete fields and invalid barcodes in plain Portuguese",()=>{
 assert.equal(validationMessage([{type:"value_error",msg:"Value error, Código de barras inválido; confira os números da embalagem",loc:["body"]}]),"Código de barras inválido; confira os números da embalagem");
 assert.match(validationMessage([{type:"greater_than",msg:"Input should be greater than 0",loc:["body","quantity_value"]}]),/^Conteúdo da embalagem:/);
 assert.equal(validationMessage("Produto já cadastrado"),"Produto já cadastrado");
});
