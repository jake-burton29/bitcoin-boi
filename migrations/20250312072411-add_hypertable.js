"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(
      "SELECT create_hypertable('page_loads', by_range('time'));"
    );
  },

  down: (queryInterface, Sequelize) => {},
};
