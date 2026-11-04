
#include <stdio.h>

int main()
{
    int rounds, round;
    int secret, guess;
    int attempts;
    int total1 = 0, total2 = 0;
    int setter, guesser;
    int lower, upper;
    int difference;

    printf("================================\n");
    printf("          NUMBER HUNT\n");
    printf("================================\n");

    printf("Enter an even number of rounds: ");
    scanf("%d", &rounds);

    while (rounds < 2 || rounds % 2 != 0)
    {
        printf("Please enter an even number (2, 4, 6...): ");
        scanf("%d", &rounds);
    }

    for (round = 1; round <= rounds; round++)
    {
        printf("\n========== ROUND %d ==========\n", round);

        if (round % 2 == 1)
        {
            setter = 1;
            guesser = 2;
        }
        else
        {
            setter = 2;
            guesser = 1;
        }

        printf("Player %d, enter a secret number (1-100): ", setter);
        scanf("%d", &secret);

        while (secret < 1 || secret > 100)
        {
            printf("Invalid! Enter a number from 1 to 100: ");
            scanf("%d", &secret);
        }

        printf("\nPass the device to Player %d.\n", guesser);
        printf("Player %d, start guessing!\n", guesser);

        lower = 1;
        upper = 100;
        attempts = 0;

        while (1)
        {
            printf("\nCurrent range: %d to %d\n", lower, upper);
            printf("Enter your guess: ");
            scanf("%d", &guess);

            if (guess < lower || guess > upper)
            {
                printf("Guess must be within the current range!\n");
                continue;
            }

            attempts++;

            if (guess == secret)
            {
                printf("\nCORRECT! You found the number!\n");
                break;
            }
            else if (guess < secret)
            {
                difference = secret - guess;

                if (difference > 10)
                    printf("TOO LOW!\n");
                else
                    printf("LOW!\n");

                lower = guess + 1;
            }
            else
            {
                difference = guess - secret;

                if (difference > 10)
                    printf("TOO HIGH!\n");
                else
                    printf("HIGH!\n");

                upper = guess - 1;
            }
        }

        printf("Player %d used %d guesses.\n", guesser, attempts);

        if (guesser == 1)
            total1 += attempts;
        else
            total2 += attempts;
    }

    printf("\n================================\n");
    printf("          FINAL RESULTS\n");
    printf("================================\n");

    printf("Player 1 total guesses: %d\n", total1);
    printf("Player 2 total guesses: %d\n", total2);

    if (total1 < total2)
        printf("\nPLAYER 1 WINS!\n");
    else if (total2 < total1)
        printf("\nPLAYER 2 WINS!\n");
    else
        printf("\nMATCH DRAW!\n");

    printf("================================\n");

    return 0;
}
