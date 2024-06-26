const { Artigo, AutorArtigo, Usuario, AvaliacaoArtigo } = require('../models')
const url = require('url');

const statusArtigoEnum = require('../enums/StatusArtigo')
const tipoUsuarioEnum = require('../enums/TipoUsuario')

async function validarAutorArtigo(user, idArtigo){
    if(user.tipousuario === tipoUsuarioEnum.AUTOR){
        const resArtigo = await AutorArtigo.findAll({
            where: {
                idArtigo: idArtigo,
                idAutor: user.idUsuario
            }
        })

        const autorArtigos = resArtigo.map( art => art.toJSON())

        return autorArtigos.length > 0

    }else{
        return false
    }

}

function getCreate(req, res) {
    res.render('artigo/artigoCreate', {options: 
        {
            hrefTemplate: '/usuario/getFindAll',
            hrefCreate: '/artigo/create'
        }
    })
}

async function postCreate(req,res){

    if(req.session.user.tipousuario !== tipoUsuarioEnum.AUTOR) return

    const {artigoTitulo, artigoResumo, artigoLink, artigoAutores} = req.body
    let artigoCriado
    try {
        artigoCriado = await Artigo.create({
            titulo: artigoTitulo,
            resumo: artigoResumo,
            link: artigoLink,
            status: statusArtigoEnum.REVISAO
        })        
    } catch (error) {
        console.log(error)
        return res.status(500).send(errpor)
    }
    
    const idArtigoCriado = artigoCriado.dataValues.idArtigo

    const artigoAutorInsert = artigoAutores.map( (autor) => {
        return { idAutor: autor, idArtigo: idArtigoCriado }
    });

    let responseBulk
    try {
        responseBulk = await AutorArtigo.bulkCreate(artigoAutorInsert)    
    } catch (error) {
        console.log(error)
        return res.status(500).send(error)
    }

    res.status(200).send({options:{response: artigoAutorInsert}})

}

async function getDelete(req, res){

    const isAutorArtigo = await validarAutorArtigo(req.session.user, req.params.idArtigo)
    if( !(isAutorArtigo || req.session.user.tipousuario === tipoUsuarioEnum.ADMIN) ) return

    await Artigo.destroy({ where: { idArtigo: req.params.idArtigo } }).then(
        AutorArtigo.destroy({where: { idArtigo: req.params.idArtigo }}).then(
            res.redirect('/artigo/list')
        ).catch(err => console.log(err))
    ).catch(err => {
        console.log(err);
    });
}

async function getUpdate(req, res){

    const artigo = await findbyPK(req.params.idArtigo)

    res.render('artigo/artigoUpdate', {
        options:{
            hrefTemplate: '/usuario/getFindAll',
            hrefUpdate: '/artigo/update'
        },
        artigo: artigo
    })
}

async function postUpdate(req, res){

    const {idArtigo, artigoTitulo, artigoResumo, artigoLink, artigoAutores } = req.body

    console.log('entrou')

    const isAutorArtigo = await validarAutorArtigo(req.session.user, idArtigo)

    if(!isAutorArtigo) return

    console.log('entrou 2')

    const resArtigo = await Artigo.update({
        titulo: artigoTitulo,
        resumo: artigoResumo,
        link: artigoLink,
        },
        {
            where: {idArtigo}
        }
    )
    const resDeleteAutorArtigo = await AutorArtigo.destroy({
        where: {idArtigo}
    })

    const artigoAutorInsert = artigoAutores.map( (autor) => {
        return { idAutor: autor, idArtigo: Number(idArtigo) }
    });

    const resAutorArtigo = await AutorArtigo.bulkCreate(artigoAutorInsert)

    res.status(200).send({options:{response: artigoAutorInsert}})

}

async function getList(req, res){

    const usuario = req.session.user

    let artigosUsuario

    if(usuario.tipousuario === 1){
        artigosUsuario = await findByUsuario(usuario.idUsuario)
    } else if (usuario.tipousuario === 0){
        artigosUsuario = await findAllArtigos()
    }

    res.render('artigo/artigoList', {
        artigos: artigosUsuario,
        options:{
            hrefTemplate: '/usuario/getFindAll',
            hrefCreate: '/artigo/create'
        }
    })
}

async function getAvaliador(req, res){

    const idArtigo = req.params.idArtigo

    const artigo = await findbyPK(idArtigo)

    const avaliadores = await findAvalidadoresArtigo(idArtigo)

    res.render('artigo/artigoAvaliador', {
        artigo: artigo,
        avaliadores: avaliadores,
        options:{
            hrefTemplate: '/usuario/getFindAll',
            hrefUpdate: '/artigo/avaliador',
            tipoUsuarioHdbs: tipoUsuarioEnum.AVALIADOR,
        }
    })
}

async function postAvaliador(req, res){

    const {idArtigo, artigoAvaliadores } = req.body

    if( req.session.user.tipousuario !== tipoUsuarioEnum.ADMIN ) return


    const resDeleteAvaliadorArtigo = await AvaliacaoArtigo.destroy({
        where: {idArtigo}
    })

    const artigoAvaliadorInsert = artigoAvaliadores.map( (avaliador) => {
        return { idUsuario: avaliador, idArtigo: Number(idArtigo) }
    });

    const resAvaliadorArtigo = await AvaliacaoArtigo.bulkCreate(artigoAvaliadorInsert)

    res.status(200).send({options:{response: artigoAvaliadorInsert}})
}

async function getPublicar(req, res){

    const artigos = await findByNota()

    res.render('artigo/artigoPublicar', {
        artigos:artigos
    })
}

async function getAceitar(req, res){


    const q = url.parse(req.url, true)
    console.log(q.query)
    console.log(q.query.isAceitar)
    const isAceitar = (q.query.isAceitar === 'true' ? true : false)

    if( req.session.user.tipousuario !== tipoUsuarioEnum.ADMIN ) return

    const idArtigo = req.params.idArtigo

    const statusArtigo = isAceitar ? statusArtigoEnum.ACEITO : statusArtigoEnum.REJEITADO

    const resArtigo = await Artigo.update({
        status: statusArtigo,
        },
        {
            where: {idArtigo}
        }
    )

    res.redirect('/artigo/publicar')

}

async function findByNota(){
    const res = await Artigo.findAll({
        attributes:['titulo','idArtigo'],
        include:{
            attributes:['idAutor'],
            model: AutorArtigo,
        },
        where: {
            status: statusArtigoEnum.REVISAO
        }
    })

    const autorArtigos = res.map( art => art.toJSON())
    const artigos = await Promise.all(autorArtigos.map( async (artigo) => {

        const autoresBanco = await AutorArtigo.findAll({
            where:{
                idArtigo: artigo.idArtigo
            },
            include:{
                attributes:['nome'],
                model:Usuario
            }
        })

        const autores = autoresBanco.map(autoresArtigo => autoresArtigo.toJSON())

        const resAvaliadoresArtigo = await AvaliacaoArtigo.findAll({
            where:{
                idArtigo: artigo.idArtigo
            }
        })


        const avaliadoresArtigo = resAvaliadoresArtigo.map( avaliacao => {
            return avaliacao.toJSON()
        })

        let somaNota
        let mediaNota
        if(avaliadoresArtigo.length > 0){
            somaNota = avaliadoresArtigo.reduce( (acc, avaliacao) => {
                return acc + ((Number(avaliacao.notaRelevancia) ?? 0) * (Number(avaliacao.notaExperiencia) ?? 0))
            }, 0)
            mediaNota = (somaNota ?? 0) / (avaliadoresArtigo.length ?? 0) ?? 0
        } else{
            mediaNota = 0
        }

        return { 
            autores: autores, 
            nomeAutores: autores.map( autor => autor.Usuario.nome).join(', '),
            idArtigo: artigo.idArtigo,
            titulo: artigo.titulo,
            media: mediaNota,
        }

    }))

    const artigosSortNota = artigos.sort( (a, b) => b.media - a.media )

    return artigosSortNota
}

async function findAllArtigos(){
    const res = await Artigo.findAll({
        attributes:['titulo','link', 'status','idArtigo'],
        include:{
            attributes:['idAutor'],
            model: AutorArtigo,
        },
        
    })
    const autorArtigos = res.map( art => art.toJSON())
    const artigos = await Promise.all(autorArtigos.map( async (artigo) => {

        const autoresBanco = await AutorArtigo.findAll({
            where:{
                idArtigo: artigo.idArtigo
            },
            include:{
                attributes:['nome'],
                model:Usuario
            }
        })

        const autores = autoresBanco.map(autoresArtigo => autoresArtigo.toJSON())

        return { 
            autores: autores, 
            nomeAutores: autores.map( autor => autor.Usuario.nome).join(', '),
            idArtigo: artigo.idArtigo,
            titulo: artigo.titulo,
            link: artigo.link,
            status: statusArtigoEnum.toString(artigo.status),
        }
    }))

    return artigos
}

async function findByUsuario(idUsuario){
    const res = await Artigo.findAll({
        attributes:['titulo','link', 'status','idArtigo'],
        include:{
            attributes:['idAutor'],
            model: AutorArtigo,
            where:{
                idAutor: idUsuario
            },
        },
        
    })
    const autorArtigos = res.map( art => art.toJSON())
    const artigos = await Promise.all(autorArtigos.map( async (artigo) => {

        const autoresBanco = await AutorArtigo.findAll({
            where:{
                idArtigo: artigo.idArtigo
            },
            include:{
                attributes:['nome'],
                model:Usuario
            }
        })

        const autores = autoresBanco.map(autoresArtigo => autoresArtigo.toJSON())

        return { 
            autores: autores, 
            nomeAutores: autores.map( autor => autor.Usuario.nome).join(', '),
            idArtigo: artigo.idArtigo,
            titulo: artigo.titulo,
            link: artigo.link,
            status: statusArtigoEnum.toString(artigo.status),
        }
    }))

    return artigos
}

async function findbyPK(idArtigo){
    const resArtigo = await Artigo.findByPk(idArtigo)

    const artigo = resArtigo.dataValues

    const resAutoresArtigo = await AutorArtigo.findAll({
        where:{
            idArtigo: idArtigo
        },
        include:{
            attributes: ['nome', 'email'],
            model: Usuario
        }
    })

    const autoresArtigo = resAutoresArtigo
            .map( autArt => autArt.toJSON())
            .map( autArt => {
                return {
                    idAutor: autArt.idAutor,
                    nome: autArt.Usuario.nome,
                    email: autArt.Usuario.email,
                }
            })

    const artigo_return = {
        ...artigo,
        statusNome: statusArtigoEnum.toString(artigo.status),
        autores: autoresArtigo
    }

    console.log(artigo_return)

    return artigo_return
}

async function findAvalidadoresArtigo(idArtigo){
    const resAvaliadoresArtigo = await AvaliacaoArtigo.findAll({
        where:{
            idArtigo: idArtigo
        },
        include:{
            attributes: ['nome', 'email'],
            model: Usuario
        }
    })

    const avaliadoresArtigo = resAvaliadoresArtigo
            .map( avaArt => avaArt.toJSON())
            .map( avaArt => {
                return {
                    idUsuario: avaArt.idUsuario,
                    nome: avaArt.Usuario.nome,
                    email: avaArt.Usuario.email,
                }
            })

    console.log(avaliadoresArtigo)

    return avaliadoresArtigo
}

module.exports = {
    getCreate,
    postCreate,
    getList,
    getDelete,
    getUpdate,
    postUpdate,
    getAvaliador,
    postAvaliador,
    getPublicar,
    getAceitar,
    findByUsuario,
}