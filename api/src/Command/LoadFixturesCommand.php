<?php

namespace App\Command;

use App\Entity\Author;
use App\Entity\Book;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:load-fixtures',
    description: 'Load fixtures',
)]
class LoadFixturesCommand extends Command
{
    public function __construct(private readonly ManagerRegistry $managerRegistry)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $a = $this->managerRegistry->getManagerForClass(Author::class);
        $b = $this->managerRegistry->getManagerForClass(Book::class);

        $cmd = $a->getClassMetadata(Author::class);
        $connection = $this->managerRegistry->getConnection();
        $dbPlatform = $connection->getDatabasePlatform();

        foreach ($a->getRepository(Author::class)->findAll() as $author) {
            $a->remove($author);
        }
        $a->flush();

        foreach ($b->getRepository(Book::class)->findAll() as $book) {
            $b->remove($book);
        }
        $b->flush();

        $dan = new Author();
        $dan->setName('Dan Simmons');
        $a->persist($dan);
        $peter = new Author();
        $peter->setName("O'Donnell, Peter");
        $a->persist($peter);
        $emily = new Author();
        $emily->setName("Emily Rodda");
        $a->persist($emily);
        $a->flush();

        $x = new Book();
        $x->setTitle('Hyperion');
        $x->setAuthor($dan);
        $x->setCondition('https://schema.org/UsedCondition');
        $b->persist($x);
        $x = new Book();
        $x->setTitle('Silver Mistress');
        $x->setAuthor($peter);
        $x->setCondition('https://schema.org/RefurbishedCondition');
        $b->persist($x);
        $x = new Book();
        $x->setTitle('Silver Mistress');
        $x->setAuthor($peter);
        $x->setCondition('https://schema.org/DamagedCondition');
        $b->persist($x);
        $x = new Book();
        $x->setTitle('Dragons of Deltora');
        $x->setAuthor($emily);
        $x->setCondition('https://schema.org/NewCondition');
        $b->persist($x);
        $b->flush();

        return Command::SUCCESS;
    }
}
