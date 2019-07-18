/*
SQLyog Ultimate v11.11 (64 bit)
MySQL - 5.5.62 : Database - opencash
*********************************************************************
*/


/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`opencash` /*!40100 DEFAULT CHARACTER SET utf8 */;

USE `opencash`;

/*Table structure for table `ItemsCat` */

CREATE TABLE `ItemsCat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent` int(11) NOT NULL DEFAULT '-1',
  `order` int(11) NOT NULL DEFAULT '0',
  `name` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
  `type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0: category, 1: item',
  `people` int(11) NOT NULL DEFAULT '-1',
  `price` float NOT NULL DEFAULT '1',
  `count` int(11) NOT NULL DEFAULT '1',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `parts` text COMMENT 'if the item have multiple parts ex :"{[{''part'': 2, ''count'': 5}]}"',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `People` */

CREATE TABLE `People` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
  `color` varchar(6) CHARACTER SET utf8mb4 NOT NULL DEFAULT '000000' COMMENT 'text color',
  `password` varchar(50) DEFAULT NULL,
  `mail` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `Ticket` */

CREATE TABLE `Ticket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total` float NOT NULL DEFAULT '0',
  `type` mediumint(9) NOT NULL DEFAULT '0' COMMENT '0: especes, 1: cheque, 2: carte',
  `mail` varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  `deleted` tinyint(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `Ticketlines` */

CREATE TABLE `Ticketlines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket` int(11) NOT NULL,
  `item` int(11) NOT NULL DEFAULT '0',
  `name` varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT '1',
  `price` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
