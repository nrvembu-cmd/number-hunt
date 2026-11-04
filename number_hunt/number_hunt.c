#include <stdio.h>

int main()
{
    int rounds, round;
    int secret, guess;
    int lower, upper;
    int attempts;
    int score1 = 0, score2 = 0;
    int setter, guesser;

    printf("=================================\n");
    printf("          NUMBER HUNT\n");
    printf("=================================\n");

    printf("Enter number of rounds: ");
    scanf("%d", &rounds);

    if (rounds <= 0)
    {
        printf("Rounds must be greater than zero.\n");
        return 0;
    }

    for (round = 1; round <= rounds; round++)
    {
        /* Players exchange roles after every round. */
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

        printf("\n---------- ROUND %d ----------\n", round);
        printf("Player %d, enter a secret number (1-100): ", setter);
        scanf("%d", &secret);

        if (secret < 1 || secret > 100)
        {
            printf("Invalid secret number. Enter a number from 1 to 100.\n");
            round--;
            continue;
        }

        lower = 1;
        upper = 100;
        attempts = 0;

        printf("\nPlayer %d, start guessing!\n", guesser);

        while (lower <= upper)
        {
            printf("\nCurrent boundary: %d to %d\n", lower, upper);
            printf("Enter your guess: ");
            scanf("%d", &guess);

            if (guess < lower || guess > upper)
            {
                printf("Outside the boundary! Try again.\n");
                continue;
            }

            attempts++;

            if (guess < secret)
            {
                printf("TOO LOW!\n");
                lower = guess + 1;
            }
            else if (guess > secret)
            {
                printf("TOO HIGH!\n");
                upper = guess - 1;
            }
            else
            {
                printf("CORRECT! Player %d found the number.\n", guesser);
                printf("Attempts: %d\n", attempts);

                if (guesser == 1)
                    score1++;
                else
                    score2++;

                break;
            }
        }

        printf("\nScore after round %d:\n", round);
        printf("Player 1: %d\n", score1);
        printf("Player 2: %d\n", score2);
    }

    printf("\n========== FINAL RESULT ==========\n");
    printf("Player 1 score: %d\n", score1);
    printf("Player 2 score: %d\n", score2);

    if (score1 > score2)
        printf("PLAYER 1 WINS!\n");
    else if (score2 > score1)
        printf("PLAYER 2 WINS!\n");
    else
        printf("IT IS A DRAW!\n");

    return 0;
}
