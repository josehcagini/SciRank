'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AutorArtigo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      AutorArtigo.hasOne(models.Artigo, {
        foreignKey: "idArtigo",
        sourceKey: "idArtigo"
      }),
      AutorArtigo.hasOne(models.Usuario, {
        foreignKey: "idUsuario",
        sourceKey: "idAutor"
      })
    }
  }
  AutorArtigo.init({
    idAutor: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    idArtigo: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER
    }
  }, {
    sequelize,
    modelName: 'AutorArtigo',
    tableName: 'autor_artigo',
    freezeTableName: true,
    timestamps: false
  });
  return AutorArtigo;
};